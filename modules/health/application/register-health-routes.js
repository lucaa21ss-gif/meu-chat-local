export function registerHealthRoutes(app, deps) {
    const {
        asyncHandler,
        requireMinimumRole,
        assertBodyObject,
        parseBooleanLike,
        resolveActor,
        recordAudit,
        recordConfigVersion,
        buildOverallHealthStatus,
        buildSloSnapshot,
        getTelemetryStats,
        isTelemetryEnabled,
        setTelemetryEnabled,
        resetTelemetryStats,
        HEALTH_STATUS,
        healthProviders,
        integrityService,
        autoHealingService,
        capacityService,
        queueService,
        baselineService,
        roleLimiter,
        CONFIG_KEYS,
        store,
    } = deps;

    app.get(
        "/readyz",
        asyncHandler(async (req, res) => {
            const startTime = Date.now();
            try {
                await store.listChats();
                const duration = Date.now() - startTime;
                req.logger?.info({ duration }, "Readiness check passed");
                res.status(200).json({
                    status: "ready",
                    uptime: process.uptime(),
                    responseTime: duration,
                });
            } catch (err) {
                const duration = Date.now() - startTime;
                req.logger?.error(
                    { error: err.message, duration },
                    "Readiness check failed",
                );
                throw err;
            }
        }),
    );

    app.get(
        "/api/health",
        asyncHandler(async (req, res) => {
            const [db, model, disk] = await Promise.all([
                healthProviders.checkDb(),
                healthProviders.checkModel(),
                healthProviders.checkDisk(),
            ]);

            const checks = { db, model, disk };
            const integrityStatus = await integrityService.getOrRefresh();
            const autoHealingExecution = await autoHealingService.evaluate({
                healthChecks: checks,
            });
            const status = buildOverallHealthStatus(checks);
            const telemetry = getTelemetryStats().slice(0, 8).map((item) => ({
                ...item,
                errorRate: item.count ? Math.round((item.errors / item.count) * 100) : 0,
            }));
            const slo = buildSloSnapshot(getTelemetryStats());
            const capacity = await capacityService.getLatestSummary();
            const queue = queueService.getMetrics();
            const baselineDrift = await baselineService.check();

            const alerts = [];
            if (db.status !== HEALTH_STATUS.HEALTHY) {
                alerts.push("Banco de dados indisponivel");
            }
            if (model.status !== HEALTH_STATUS.HEALTHY) {
                alerts.push("Modelo Ollama em degradacao/offline");
            }
            if (disk.status !== HEALTH_STATUS.HEALTHY) {
                alerts.push("Espaco em disco baixo");
            }
            if (integrityStatus.status === "failed") {
                alerts.push("Divergencia de integridade detectada em artefatos criticos");
            }
            if (capacity.status === "blocked") {
                alerts.push("Orcamento de performance violado no ultimo perfil de capacidade");
            }
            if (queue.rejectedCount > 0 || (queue.queuedCount + queue.activeCount) > (queue.maxConcurrency * 2)) {
                alerts.push("Fila de operacoes proxima a saturacao - rejeitando novas requisicoes");
            }
            if (baselineDrift.status === "drift") {
                alerts.push(`Drift de configuracao detectado em: ${baselineDrift.driftedKeys.join(", ")}`);
            }

            if (autoHealingExecution.executed) {
                await recordAudit("autohealing.auto.execute", null, {
                    policy: autoHealingExecution.policy,
                    outcome: autoHealingExecution.outcome,
                    reason: autoHealingExecution.reason || null,
                });
            }

            res.json({
                status,
                generatedAt: new Date().toISOString(),
                checks,
                telemetry: {
                    enabled: isTelemetryEnabled(),
                    topRoutes: telemetry,
                },
                integrity: integrityStatus,
                capacity,
                queue,
                baseline: { status: baselineDrift.status, driftedKeys: baselineDrift.driftedKeys, checkedAt: baselineDrift.checkedAt },
                slo,
                autoHealing: autoHealingService.getStatus(),
                rateLimiter: roleLimiter.getMetrics(),
                alerts,
                memory: process.memoryUsage(),
                // Compatibilidade com frontend legado.
                ollama: model.ollama || "offline",
                latencyMs: Number(model.latencyMs || 0),
            });
        }),
    );

    app.get(
        "/api/health/public",
        asyncHandler(async (_req, res) => {
            const [db, model, disk] = await Promise.all([
                healthProviders.checkDb(),
                healthProviders.checkModel(),
                healthProviders.checkDisk(),
            ]);

            const checks = {
                db: { status: db.status },
                model: { status: model.status },
                disk: { status: disk.status },
            };

            res.json({
                status: buildOverallHealthStatus({ db, model, disk }),
                generatedAt: new Date().toISOString(),
                uptime: process.uptime(),
                checks,
            });
        }),
    );

    app.get(
        "/api/slo",
        requireMinimumRole("operator"),
        asyncHandler(async (_req, res) => {
            const telemetry = getTelemetryStats();
            const snapshot = buildSloSnapshot(telemetry);
            res.json({
                telemetryEnabled: isTelemetryEnabled(),
                ...snapshot,
            });
        }),
    );

    app.post(
        "/api/reset",
        asyncHandler(async (_req, res) => {
            await store.resetChat("default");
            res.json({ ok: true });
        }),
    );

    app.get(
        "/api/telemetry",
        asyncHandler(async (_req, res) => {
            res.json({ enabled: isTelemetryEnabled(), stats: getTelemetryStats() });
        }),
    );

    app.patch(
        "/api/telemetry",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const actor = await resolveActor(req);
            const enabled = parseBooleanLike(req.body.enabled, false);
            setTelemetryEnabled(enabled);
            if (!enabled) {
                resetTelemetryStats();
            }
            await recordConfigVersion({
                configKey: CONFIG_KEYS.APP_TELEMETRY_ENABLED,
                targetType: "app",
                targetId: null,
                value: !!enabled,
                actorUserId: actor.userId,
                source: "api",
                meta: {
                    origin: "telemetry.patch",
                },
            });
            res.json({ enabled: isTelemetryEnabled() });
        }),
    );
}
