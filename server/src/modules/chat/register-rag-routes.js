export function registerRagRoutes(app, deps) {
    const {
        asyncHandler,
        assertBodyObject,
        parseChatId,
        parseRagDocuments,
        parseSearchQuery,
        recordBlockedAttempt,
        clamp,
        store,
    } = deps;

    app.post(
        "/api/chats/:chatId/rag/documents",
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const chatId = parseChatId(req.params.chatId, "chatId");
            let documents;
            try {
                documents = parseRagDocuments(req.body);
            } catch (error) {
                await recordBlockedAttempt(req, "upload.blocked", error, {
                    route: "/api/chats/:chatId/rag/documents",
                    chatId,
                    documentsCount: Array.isArray(req.body?.documents)
                        ? req.body.documents.length
                        : 0,
                });
                throw error;
            }

            await store.ensureChat(chatId);

            const saved = [];
            for (const doc of documents) {
                // Ingestao local simples com chunking no SQLite para recuperacao por contexto.
                const result = await store.upsertRagDocument(
                    chatId,
                    doc.name,
                    doc.content,
                );
                saved.push(result);
            }

            const allDocuments = await store.listRagDocuments(chatId);
            res.status(201).json({
                saved,
                documents: allDocuments,
            });
        }),
    );

    app.get(
        "/api/chats/:chatId/rag/documents",
        asyncHandler(async (req, res) => {
            const chatId = parseChatId(req.params.chatId, "chatId");
            const documents = await store.listRagDocuments(chatId);
            res.json({ documents });
        }),
    );

    app.get(
        "/api/chats/:chatId/rag/search",
        asyncHandler(async (req, res) => {
            const chatId = parseChatId(req.params.chatId, "chatId");
            const query = parseSearchQuery(req.query?.q);
            const limit = clamp(Number.parseInt(req.query?.limit, 10) || 4, 1, 8);
            const matches = await store.searchDocumentChunks(chatId, query, {
                limit,
            });

            res.json({
                matches: matches.map((item) => ({
                    documentName: item.documentName,
                    chunkIndex: item.chunkIndex,
                    snippet: item.snippet,
                })),
            });
        }),
    );
}
