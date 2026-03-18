export function registerConfigRoutes(app, deps) {
    const {
        asyncHandler,
        requireMinimumRole,
        resolveActor,
        recordAudit,
        recordConfigVersion,
        parseConfigVersionFilters,
        parseConfigVersionId,
        areConfigValuesEqual,
        readCurrentConfigValue,
        applyConfigValue,
        baselineService,
        store,
        HttpError,
    } = deps;

    app.get(
        "/api/config/versions",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            const filters = parseConfigVersionFilters(req.query || {});
            const result = await store.listConfigVersions(filters);
            return res.json({
                versions: result.items,
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
        "/api/config/versions/:versionId/rollback",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            const actor = await resolveActor(req);
            const versionId = parseConfigVersionId(req.params.versionId);
            const version = await store.getConfigVersionById(versionId);
            if (!version) {
                throw new HttpError(404, "Versao de configuracao nao encontrada");
            }

            const currentValue = await readCurrentConfigValue(version);
            const changed = !areConfigValuesEqual(currentValue, version.value);
            let updated = null;
            if (changed) {
                updated = await applyConfigValue(version);
            }

            await recordConfigVersion({
                configKey: version.configKey,
                targetType: version.targetType,
                targetId: version.targetId,
                value: version.value,
                actorUserId: actor.userId,
                source: "rollback",
                meta: {
                    rollbackOfVersionId: version.id,
                    changed,
                },
            });

            await recordAudit("config.rollback", actor.userId, {
                configKey: version.configKey,
                targetType: version.targetType,
                targetId: version.targetId,
                sourceVersionId: version.id,
                changed,
            });

            return res.json({
                ok: true,
                changed,
                sourceVersionId: version.id,
                configKey: version.configKey,
                targetType: version.targetType,
                targetId: version.targetId,
                value: version.value,
                updated,
            });
        }),
    );

    app.get(
        "/api/config/baseline",
        requireMinimumRole("operator"),
        asyncHandler(async (_req, res) => {
            const drift = await baselineService.check();
            return res.json(drift);
        }),
    );

    app.post(
        "/api/config/baseline",
        requireMinimumRole("operator"),
        asyncHandler(async (req, res) => {
            const actor = await resolveActor(req);
            const before = await baselineService.check();
            const hasDrift = before.hasSaved && before.status === "drift";
            const record = await baselineService.save();
            await recordAudit(
                hasDrift ? "config.baseline.reconciled" : "config.baseline.saved",
                actor.userId,
                {
                    driftedKeys: before.driftedKeys ?? [],
                    reconciled: hasDrift,
                    savedAt: record.savedAt,
                },
            );
            return res.json({
                ok: true,
                reconciled: hasDrift,
                driftedKeys: before.driftedKeys ?? [],
                baseline: record.config,
                savedAt: record.savedAt,
            });
        }),
    );
}
