export function registerStorageRoutes(app, deps) {
    const {
        asyncHandler,
        requireMinimumRole,
        assertBodyObject,
        parseUserId,
        parseCleanupMode,
        parseCleanupTarget,
        parseCleanupOlderThanDays,
        parseCleanupMaxDeleteMb,
        parseCleanupPreserveValidatedBackups,
        parseBackupPassphrase,
        resolveActor,
        requireOperationalApproval,
        storageService,
        store,
    } = deps;

    app.get(
        "/api/storage/usage",
        asyncHandler(async (req, res) => {
            const userId = parseUserId(req.query?.userId);
            const usage = await storageService.getUsage();
            const user = await store.getUserById(userId);
            const storageLimitMb = Number.parseInt(user?.storageLimitMb, 10) || 512;
            const storageLimitBytes = storageLimitMb * 1024 * 1024;
            const usagePercent = Math.round((usage.totalBytes / storageLimitBytes) * 100);

            return res.json({
                userId,
                limit: {
                    storageLimitMb,
                    storageLimitBytes,
                },
                usage: {
                    dbBytes: usage.dbBytes,
                    uploadsBytes: usage.uploadsBytes,
                    documentsBytes: usage.documentsBytes,
                    backupsBytes: usage.backupsBytes,
                    totalBytes: usage.totalBytes,
                },
                usagePercent,
            });
        }),
    );

    app.post(
        "/api/storage/cleanup",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const mode = parseCleanupMode(req.body.mode);
            const target = parseCleanupTarget(req.body.target);
            const olderThanDays = parseCleanupOlderThanDays(req.body.olderThanDays);
            const maxDeleteMb = parseCleanupMaxDeleteMb(req.body.maxDeleteMb);
            const preserveValidatedBackups = parseCleanupPreserveValidatedBackups(
                req.body.preserveValidatedBackups,
            );
            const backupPassphrase = parseBackupPassphrase(req.body.backupPassphrase);
            const actor = await resolveActor(req);

            if (mode === "execute") {
                await requireOperationalApproval(req, {
                    action: "storage.cleanup.execute",
                    actorUserId: actor.userId,
                });
            }

            const result = await storageService.cleanup({
                target,
                olderThanDays,
                maxDeleteMb,
                execute: mode === "execute",
                preserveValidatedBackups,
                backupPassphrase,
            });

            return res.json({ cleanup: result });
        }),
    );
}
