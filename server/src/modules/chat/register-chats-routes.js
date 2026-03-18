export function registerChatsRoutes(app, deps) {
    const {
        asyncHandler,
        assertBodyObject,
        parseChatId,
        parseTitle,
        parseUserId,
        parseChatListFilters,
        parseBooleanLike,
        parseTags,
        parseSystemPrompt,
        parseSearchQuery,
        parseSearchPage,
        parseSearchLimit,
        parseSearchRole,
        parseSearchDate,
        parseChatImportPayload,
        parseUserOnly,
        recordBlockedAttempt,
        resolveActor,
        recordAudit,
        recordConfigVersion,
        requireMinimumRole,
        CONFIG_KEYS,
        store,
        HttpError,
    } = deps;

    app.get(
        "/api/chats",
        asyncHandler(async (req, res) => {
            const userId = parseUserId(req.query?.userId);
            const filters = parseChatListFilters(req.query || {});
            const result = await store.listChats(userId, {
                ...filters,
                returnPagination: true,
            });
            res.json({
                chats: result.items,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            });
        }),
    );

    app.post(
        "/api/chats",
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const generatedId = `chat-${Date.now()}`;
            const id = parseChatId(req.body.id || generatedId, "id");
            const title = parseTitle(req.body.title, "Nova conversa");
            const userId = parseUserId(req.body.userId);
            const created = await store.createChat(id, title, userId);
            res.status(201).json({ chat: created });
        }),
    );

    app.post(
        "/api/chats/:chatId/duplicate",
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);

            const sourceId = parseChatId(req.params.chatId, "chatId");
            const generatedId = `chat-${Date.now()}`;
            const targetId = parseChatId(req.body.id || generatedId, "id");
            const title =
                req.body.title === undefined
                    ? undefined
                    : parseTitle(req.body.title, "Nova conversa");
            const userOnly = parseUserOnly(req.body.userOnly);

            const cloned = await store.duplicateChat(sourceId, targetId, title, {
                userOnly,
            });
            if (!cloned) {
                throw new HttpError(404, "Chat de origem nao encontrado");
            }

            return res.status(201).json({ chat: cloned });
        }),
    );

    app.patch(
        "/api/chats/:chatId",
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const chatId = parseChatId(req.params.chatId, "chatId");
            const title = parseTitle(req.body.title, "Nova conversa");

            const updated = await store.renameChat(chatId, title);
            if (!updated) {
                throw new HttpError(404, "Chat nao encontrado");
            }

            return res.json({ chat: updated });
        }),
    );

    app.patch(
        "/api/chats/:chatId/favorite",
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const chatId = parseChatId(req.params.chatId, "chatId");
            const isFavorite = parseBooleanLike(req.body.isFavorite, false);
            const updated = await store.setChatFavorite(chatId, isFavorite);
            if (!updated) {
                throw new HttpError(404, "Chat nao encontrado");
            }
            return res.json({ chat: updated });
        }),
    );

    app.patch(
        "/api/chats/:chatId/archive",
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const chatId = parseChatId(req.params.chatId, "chatId");
            const archived = parseBooleanLike(req.body.archived, false);
            const updated = await store.setChatArchived(chatId, archived);
            if (!updated) {
                throw new HttpError(404, "Chat nao encontrado");
            }
            return res.json({ chat: updated });
        }),
    );

    app.patch(
        "/api/chats/:chatId/tags",
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const chatId = parseChatId(req.params.chatId, "chatId");
            const tags = parseTags(req.body.tags);
            const updated = await store.setChatTags(chatId, tags);
            if (!updated) {
                throw new HttpError(404, "Chat nao encontrado");
            }
            return res.json({ chat: updated });
        }),
    );

    app.get(
        "/api/chats/:chatId/system-prompt",
        asyncHandler(async (req, res) => {
            const chatId = parseChatId(req.params.chatId, "chatId");
            const promptContext = await store.getChatSystemPrompts(chatId);
            if (!promptContext) throw new HttpError(404, "Chat nao encontrado");
            res.json({
                chatId,
                systemPrompt: promptContext.systemPrompt || "",
                defaultSystemPrompt: promptContext.defaultSystemPrompt || "",
            });
        }),
    );

    app.patch(
        "/api/chats/:chatId/system-prompt",
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const actor = await resolveActor(req);
            const chatId = parseChatId(req.params.chatId, "chatId");
            const systemPrompt = parseSystemPrompt(req.body.systemPrompt);
            const updated = await store.setChatSystemPrompt(chatId, systemPrompt);
            if (!updated) throw new HttpError(404, "Chat nao encontrado");
            await recordConfigVersion({
                configKey: CONFIG_KEYS.CHAT_SYSTEM_PROMPT,
                targetType: "chat",
                targetId: chatId,
                value: systemPrompt,
                actorUserId: actor.userId,
                source: "api",
                meta: {
                    origin: "chat.system-prompt.patch",
                },
            });
            return res.json({ chat: updated });
        }),
    );

    app.delete(
        "/api/chats/:chatId",
        asyncHandler(async (req, res) => {
            const chatId = parseChatId(req.params.chatId, "chatId");
            const deleted = await store.deleteChat(chatId);
            if (!deleted) {
                throw new HttpError(404, "Chat nao encontrado");
            }

            await recordAudit("chat.delete", null, {
                chatId,
            });

            return res.json({ ok: true });
        }),
    );

    app.get(
        "/api/chats/:chatId/messages",
        asyncHandler(async (req, res) => {
            const chatId = parseChatId(req.params.chatId, "chatId");
            const messages = await store.getMessages(chatId);
            res.json({ messages });
        }),
    );

    app.get(
        "/api/chats/:chatId/search",
        asyncHandler(async (req, res) => {
            const chatId = parseChatId(req.params.chatId, "chatId");
            const query = parseSearchQuery(req.query?.q);
            const page = parseSearchPage(req.query?.page);
            const limit = parseSearchLimit(req.query?.limit);
            const role = parseSearchRole(req.query?.role);
            const from = parseSearchDate(req.query?.from, "from");
            const to = parseSearchDate(req.query?.to, "to");

            if (from && to && new Date(from) > new Date(to)) {
                throw new HttpError(400, "Parametro from nao pode ser maior que to");
            }

            const result = await store.searchMessages(chatId, query, {
                page,
                limit,
                role,
                from,
                to,
            });

            res.json({
                matches: result.items,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            });
        }),
    );

    app.post(
        "/api/chats/:chatId/reset",
        asyncHandler(async (req, res) => {
            const chatId = parseChatId(req.params.chatId, "chatId");
            await store.resetChat(chatId);
            res.json({ ok: true });
        }),
    );

    app.get(
        "/api/chats/:chatId/export",
        requireMinimumRole("operator"),
        asyncHandler(async (req, res) => {
            const chatId = parseChatId(req.params.chatId, "chatId");
            const format = String(req.query.format || "md").toLowerCase();

            if (format === "json") {
                const payload = await store.exportChatJson(chatId);
                if (!payload) throw new HttpError(404, "Chat nao encontrado");
                await recordAudit("chat.export", payload?.chat?.userId || null, {
                    chatId,
                    format: "json",
                });
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename="chat-${chatId}.json"`,
                );
                return res.send(JSON.stringify(payload, null, 2));
            }

            if (!["md", "markdown"].includes(format)) {
                throw new HttpError(400, "Formato de exportacao invalido");
            }

            const markdown = await store.exportChatMarkdown(chatId);
            if (!markdown) throw new HttpError(404, "Chat nao encontrado");
            await recordAudit("chat.export", null, {
                chatId,
                format: "markdown",
            });
            res.setHeader("Content-Type", "text/markdown; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="chat-${chatId}.md"`,
            );
            return res.send(markdown);
        }),
    );

    app.get(
        "/api/chats/export",
        requireMinimumRole("operator"),
        asyncHandler(async (req, res) => {
            const userId = parseUserId(req.query?.userId);
            const format = String(req.query?.format || "json").toLowerCase();
            const favoritesOnly = parseBooleanLike(req.query?.favorites, false);

            const activeChats = await store.listChats(userId, {
                favoriteOnly: favoritesOnly,
                showArchived: false,
                tag: null,
            });
            const archivedChats = await store.listChats(userId, {
                favoriteOnly: favoritesOnly,
                showArchived: true,
                tag: null,
            });
            const chats = [...activeChats, ...archivedChats].filter(
                (chat, idx, arr) =>
                    arr.findIndex((item) => item.id === chat.id) === idx,
            );

            if (format === "markdown" || format === "md") {
                const markdownSections = [];
                for (const chat of chats) {
                    const markdown = await store.exportChatMarkdown(chat.id);
                    if (markdown) markdownSections.push(markdown);
                }

                const mergedMarkdown = markdownSections.join("\n\n---\n\n");
                res.setHeader("Content-Type", "text/markdown; charset=utf-8");
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename="chats-${userId}-${favoritesOnly ? "favoritos" : "todos"}.md"`,
                );
                await recordAudit("chat.export.batch", userId, {
                    chatsCount: markdownSections.length,
                    format: "markdown",
                    favoritesOnly,
                });
                return res.send(mergedMarkdown || "# Nenhuma conversa encontrada");
            }

            if (format !== "json") {
                throw new HttpError(400, "Formato de exportacao em lote invalido");
            }

            const exported = [];
            for (const chat of chats) {
                const payload = await store.exportChatJson(chat.id);
                if (payload?.chat) exported.push(payload.chat);
            }

            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="chats-${userId}.json"`,
            );
            await recordAudit("chat.export.batch", userId, {
                chatsCount: exported.length,
                format: "json",
                favoritesOnly,
            });
            return res.send(
                JSON.stringify(
                    {
                        version: 1,
                        exportedAt: new Date().toISOString(),
                        userId,
                        chats: exported,
                    },
                    null,
                    2,
                ),
            );
        }),
    );

    app.post(
        "/api/chats/import",
        requireMinimumRole("operator"),
        asyncHandler(async (req, res) => {
            let payload;
            try {
                payload = parseChatImportPayload(req.body);
            } catch (error) {
                await recordBlockedAttempt(req, "import.blocked", error, {
                    route: "/api/chats/import",
                });
                throw error;
            }

            const forceNew = parseBooleanLike(req.query.forceNew, false);
            const result = await store.importChatJson(payload, { forceNew });
            await recordAudit("chat.import", result?.userId || null, {
                chatId: result?.id,
                forceNew,
            });
            return res.status(201).json({ chat: result });
        }),
    );
}
