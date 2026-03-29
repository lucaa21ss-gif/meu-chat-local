export function registerChatRoutes(app, deps) {
    const {
        asyncHandler,
        assertBodyObject,
        parseMessage,
        getChatId,
        parseOptions,
        parseRagOptions,
        getMessageImages,
        recordBlockedAttempt,
        buildRagSystemMessage,
        buildSystemMessages,
        executeWithModelRecovery,
        ollamaFallbackModel,
        ollamaMaxAttempts,
        ollamaTimeoutMs,
        ollamaRetryDelays,
        chatClient,
        queueService,
        store,
        HttpError,
    } = deps;

    app.post(
        "/api/chat",
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const message = parseMessage(req.body);
            const chatId = getChatId(req.body);
            const options = parseOptions(req.body);
            const rag = parseRagOptions(req.body);
            let images;
            try {
                images = getMessageImages(req.body);
            } catch (error) {
                await recordBlockedAttempt(req, "upload.blocked", error, {
                    route: "/api/chat",
                    chatId,
                    imagesCount: Array.isArray(req.body?.images) ? req.body.images.length : 0,
                });
                throw error;
            }

            await store.ensureChat(chatId);
            await store.appendMessage(chatId, "user", message, images);
            await store.renameChatFromFirstMessage(chatId, message);

            const history = await store.getMessages(chatId);
            const ragChunks = rag.enabled
                ? await store.searchDocumentChunks(chatId, message, { limit: rag.topK })
                : [];
            const ragSystemMessage = buildRagSystemMessage(ragChunks);
            const promptContext = (await store.getChatSystemPrompts(chatId)) || {};

            const messagesPayload = history.map((item) => ({
                role: item.role,
                content: item.content,
                ...(item.images?.length ? { images: item.images } : {}),
            }));

            const systemMessages = buildSystemMessages({
                defaultSystemPrompt: promptContext.defaultSystemPrompt,
                chatSystemPrompt: promptContext.systemPrompt,
                ragSystemMessage,
            });
            if (systemMessages.length) {
                messagesPayload.unshift(...systemMessages);
            }

            const payload = {
                messages: messagesPayload,
                options: {
                    temperature: options.temperature,
                    num_ctx: options.num_ctx,
                },
            };

            const {
                result: response,
                modelUsed,
                attempt,
            } = await executeWithModelRecovery({
                primaryModel: options.model,
                fallbackModel: ollamaFallbackModel,
                maxAttempts: ollamaMaxAttempts,
                timeoutMs: ollamaTimeoutMs,
                retryDelays: ollamaRetryDelays,
                logger: req.logger,
                run: (model) => chatClient.chat({ ...payload, model }),
            });

            req.logger?.info(
                { modelUsed, attempt, ragEnabled: rag.enabled },
                "Inferencia concluida",
            );

            const reply = String(response.message?.content || "");
            await store.appendMessage(chatId, "assistant", reply);

            res.json({
                reply,
                chatId,
                citations: ragChunks.map((item) => ({
                    documentName: item.documentName,
                    chunkIndex: item.chunkIndex,
                    snippet: item.snippet,
                })),
            });
        }),
    );

    app.post("/api/chat-stream", async (req, res) => {
        // Enfileirar a operação com prioridade alta (priority=1)
        const taskId = `chat-stream-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        try {
            await queueService.enqueue(
                taskId,
                async () => {
                    // Função que executa a operação principal
                    assertBodyObject(req.body);

                    const message = parseMessage(req.body);
                    const chatId = getChatId(req.body);
                    const options = parseOptions(req.body);
                    const rag = parseRagOptions(req.body);
                    let images;
                    try {
                        images = getMessageImages(req.body);
                    } catch (error) {
                        await recordBlockedAttempt(req, "upload.blocked", error, {
                            route: "/api/chat-stream",
                            chatId,
                            imagesCount: Array.isArray(req.body?.images) ? req.body.images.length : 0,
                        });
                        throw error;
                    }

                    await store.ensureChat(chatId);
                    await store.appendMessage(chatId, "user", message, images);
                    await store.renameChatFromFirstMessage(chatId, message);

                    const history = await store.getMessages(chatId);

                    let fullReply = "";

                    const ragChunks = rag.enabled
                        ? await store.searchDocumentChunks(chatId, message, { limit: rag.topK })
                        : [];
                    const ragSystemMessage = buildRagSystemMessage(ragChunks);
                    const promptContext = (await store.getChatSystemPrompts(chatId)) || {};

                    const messagesPayload = history.map((item) => ({
                        role: item.role,
                        content: item.content,
                        ...(item.images?.length ? { images: item.images } : {}),
                    }));

                    const systemMessages = buildSystemMessages({
                        defaultSystemPrompt: promptContext.defaultSystemPrompt,
                        chatSystemPrompt: promptContext.systemPrompt,
                        ragSystemMessage,
                    });
                    if (systemMessages.length) {
                        messagesPayload.unshift(...systemMessages);
                    }

                    const clientAbortController = new AbortController();
                    req.on("close", () => {
                        clientAbortController.abort();
                    });

                    const payload = {
                        messages: messagesPayload,
                        stream: true,
                        abortSignal: clientAbortController.signal,
                        options: {
                            temperature: options.temperature,
                            num_ctx: options.num_ctx,
                        },
                    };

                    const {
                        result: stream,
                        modelUsed,
                        attempt,
                    } = await executeWithModelRecovery({
                        primaryModel: options.model,
                        fallbackModel: ollamaFallbackModel,
                        maxAttempts: ollamaMaxAttempts,
                        timeoutMs: ollamaTimeoutMs,
                        retryDelays: ollamaRetryDelays,
                        logger: req.logger,
                        run: (model) => chatClient.chat({ ...payload, model }),
                    });

                    req.logger?.info(
                        { modelUsed, attempt, ragEnabled: rag.enabled },
                        "Streaming iniciado",
                    );

                    res.setHeader("Content-Type", "text/plain; charset=utf-8");
                    res.setHeader("Transfer-Encoding", "chunked");

                    for await (const part of stream) {
                        const chunk = part.message?.content ?? part.delta?.content ?? "";

                        if (!chunk) continue;

                        fullReply += chunk;
                        res.write(chunk);
                    }

                    await store.appendMessage(chatId, "assistant", fullReply);
                    res.end();
                },
                1, // High priority
            );
        } catch (err) {
            if (!res.headersSent) {
                if (
                    err.message &&
                    err.message.includes("Queue full")
                ) {
                    const status = 429;
                    const queueMetrics = queueService.getMetrics();
                    const message = `Servidor saturado: fila cheia (${queueMetrics.queuedCount}/${queueMetrics.maxQueueSize})`;
                    res.status(status).json({ error: message });
                    req.logger?.warn(
                        { queuedCount: queueMetrics.queuedCount, maxQueueSize: queueMetrics.maxQueueSize },
                        "Chat request rejected due to queue saturation",
                    );
                    return;
                }
                const status = err instanceof HttpError ? err.status : 500;
                const message =
                    err instanceof HttpError ? err.message : "Erro no streaming";
                res.status(status).json({ error: message });
                return;
            }
            res.end();
        }
    });
}
