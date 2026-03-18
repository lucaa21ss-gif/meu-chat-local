export function registerBackupRoutes(app, deps) {
    const {
        asyncHandler,
        requireMinimumRole,
        assertBodyObject,
        resolveActor,
        requireOperationalApproval,
        parseBackupPassphrase,
        parseBackupPayload,
        parsePositiveInt,
        recordAudit,
        backupService,
        HttpError,
    } = deps;

    app.get(
        "/api/backup/export",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            const passphrase = parseBackupPassphrase(req.headers["x-backup-passphrase"]);
            const backup = await backupService.createBackup({ passphrase });
            await recordAudit("backup.export", null, {
                fileName: backup.fileName,
                sizeBytes: backup.sizeBytes,
                encrypted: !!backup.isEncrypted,
            });
            res.setHeader("Content-Type", backup.contentType || "application/gzip");
            res.setHeader("X-Backup-Protected", backup.isEncrypted ? "true" : "false");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${backup.fileName}"`,
            );
            return res.send(backup.archiveBuffer);
        }),
    );

    app.post(
        "/api/backup/restore",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const actor = await resolveActor(req);
            await requireOperationalApproval(req, {
                action: "backup.restore",
                actorUserId: actor.userId,
            });
            const archiveBuffer = parseBackupPayload(req.body.archiveBase64);
            const passphrase = parseBackupPassphrase(req.body.passphrase);
            let result;
            try {
                result = await backupService.restoreBackup(archiveBuffer, { passphrase });
            } catch (error) {
                const message = String(error?.message || "");
                if (message.toLowerCase().includes("backup") || message.toLowerCase().includes("passphrase")) {
                    throw new HttpError(400, message || "Falha ao restaurar backup");
                }
                throw error;
            }
            await recordAudit("backup.restore", null, {
                restored: true,
                encrypted: !!result?.encrypted,
            });
            return res.json({ ok: true, restore: result });
        }),
    );

    app.get(
        "/api/backup/validate",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            const limit = parsePositiveInt(req.query?.limit, 3, 1, 20);
            const passphrase = parseBackupPassphrase(req.headers["x-backup-passphrase"]);
            const validation = await backupService.validateRecentBackups({
                limit,
                passphrase,
            });

            await recordAudit("backup.validate", null, {
                status: validation.status,
                checked: Array.isArray(validation.items) ? validation.items.length : 0,
            });

            return res.json({
                ok: validation.status === "ok",
                validation,
            });
        }),
    );
}
