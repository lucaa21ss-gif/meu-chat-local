export function registerAuditRoutes(app, deps) {
    const {
        asyncHandler,
        requireMinimumRole,
        parseAuditFilters,
        store,
    } = deps;

    app.get(
        "/api/audit/logs",
        asyncHandler(async (req, res) => {
            const filters = parseAuditFilters(req.query || {});
            const result = await store.listAuditLogs(filters);
            return res.json({
                logs: result.items,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            });
        }),
    );

    app.get(
        "/api/audit/export",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            const filters = parseAuditFilters(req.query || {});
            const payload = await store.exportAuditLogs(filters);
            const userId = filters.userId || "all";
            const type = filters.eventType || "all";
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="audit-${userId}-${type}.json"`,
            );
            return res.send(JSON.stringify(payload, null, 2));
        }),
    );
}
