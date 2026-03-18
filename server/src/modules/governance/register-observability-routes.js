export function registerObservabilityRoutes(app, deps) {
    const {
        asyncHandler,
        requireMinimumRole,
        recordAudit,
        buildOverallHealthStatus,
        buildSloSnapshot,
        buildTriageRecommendations,
        getTelemetryStats,
        isTelemetryEnabled,
        healthProviders,
        backupService,
        integrityService,
        capacityService,
        baselineService,
        autoHealingService,
        incidentService,
        queueService,
        scorecardService,
        approvalService,
        storageService,
        roleLimiter,
        store,
    } = deps;

    app.get(
        "/api/capacity/latest",
        requireMinimumRole("operator"),
        asyncHandler(async (_req, res) => {
            const capacity = await capacityService.getLatestSummary();
            return res.json({ capacity });
        }),
    );

    app.get(
        "/api/scorecard",
        requireMinimumRole("operator"),
        asyncHandler(async (_req, res) => {
            const [healthDb, healthModel, healthDisk] = await Promise.all([
                healthProviders.checkDb(),
                healthProviders.checkModel(),
                healthProviders.checkDisk(),
            ]);

            const healthChecks = { db: healthDb, model: healthModel, disk: healthDisk };
            const health = {
                status: buildOverallHealthStatus(healthChecks),
                checks: healthChecks,
            };

            const sloSnapshot = buildSloSnapshot(
                getTelemetryStats().map((item) => ({
                    ...item,
                    errorRate: item.count ? Math.round((item.errors / item.count) * 100) : 0,
                })),
            );

            const backupValidation = await backupService
                .validateRecentBackups({ limit: 3 })
                .catch(() => ({ status: "falha", items: [] }));

            const [integrity, capacity, baseline] = await Promise.all([
                integrityService.getOrRefresh(),
                capacityService.getLatestSummary(),
                baselineService.check(),
            ]);

            const autoHealing = autoHealingService.getStatus();
            const incident = incidentService.getStatus();
            const queue = queueService.getMetrics();
            const pendingResult = await approvalService.list({ status: "pending", limit: 200 });
            const pendingApprovals = pendingResult.total;

            const scorecard = await scorecardService.generate({
                health,
                slo: sloSnapshot,
                backupValidation,
                integrity,
                capacity,
                autoHealing,
                incident,
                baseline,
                pendingApprovals,
                queue,
            });

            await recordAudit("scorecard.generated", null, {
                status: scorecard.status,
                dimensionsCount: scorecard.dimensions.length,
            });

            return res.json({ scorecard });
        }),
    );

    // Pacote de diagnostico local para suporte tecnico
    app.get(
        "/api/diagnostics/export",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            const traceId = req.id || null;
            const generatedAt = new Date().toISOString();

            const [healthDb, healthModel, healthDisk] = await Promise.all([
                healthProviders.checkDb(),
                healthProviders.checkModel(),
                healthProviders.checkDisk(),
            ]);

            const auditPage = await store.listAuditLogs({ page: 1, limit: 50 });
            const configPage = await store.listConfigVersions({ page: 1, limit: 50 });
            const telemetry = getTelemetryStats().slice(0, 20).map((item) => ({
                ...item,
                errorRate: item.count ? Math.round((item.errors / item.count) * 100) : 0,
            }));
            const rateLimiterMetrics = roleLimiter.getMetrics();
            const storageSnapshot = await storageService.getUsage().catch(() => null);
            const backupValidationSnapshot = await backupService
                .validateRecentBackups({ limit: 3 })
                .catch((error) => ({
                    checkedAt: new Date().toISOString(),
                    limit: 3,
                    status: "falha",
                    items: [],
                    error: String(error?.message || "Falha ao validar backups"),
                }));
            const integritySnapshot = await integrityService.getOrRefresh();
            const capacitySnapshot = await capacityService.getLatestSummary();
            const baselineDriftSnapshot = await baselineService.check();
            const sloSnapshot = buildSloSnapshot(
                getTelemetryStats().map((item) => ({
                    ...item,
                    errorRate: item.count ? Math.round((item.errors / item.count) * 100) : 0,
                })),
            );
            const recentErrors = auditPage.items
                .filter(
                    (entry) =>
                        typeof entry.eventType === "string" &&
                        (entry.eventType.includes("blocked") || entry.eventType.includes("error")),
                )
                .slice(0, 20);
            const incidentStatusSnapshot = incidentService.getStatus();
            const triageRecommendations = buildTriageRecommendations({
                health: {
                    status: buildOverallHealthStatus({
                        db: healthDb,
                        model: healthModel,
                        disk: healthDisk,
                    }),
                },
                slo: sloSnapshot,
                backupValidation: backupValidationSnapshot,
                rateLimiter: rateLimiterMetrics,
                recentErrors,
                incidentStatus: incidentStatusSnapshot,
            });

            const payload = {
                version: 2,
                generatedAt,
                traceId,
                app: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    uptime: Math.round(process.uptime()),
                    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
                },
                health: {
                    status: buildOverallHealthStatus({ db: healthDb, model: healthModel, disk: healthDisk }),
                    checks: { db: healthDb, model: healthModel, disk: healthDisk },
                },
                rateLimiter: rateLimiterMetrics,
                telemetry: {
                    enabled: isTelemetryEnabled(),
                    topRoutes: telemetry,
                },
                integrity: integritySnapshot,
                capacity: capacitySnapshot,
                queue: queueService.getMetrics(),
                baseline: baselineDriftSnapshot,
                autoHealing: autoHealingService.getStatus(),
                storage: storageSnapshot,
                backupValidation: backupValidationSnapshot,
                slo: sloSnapshot,
                incidentStatus: incidentStatusSnapshot,
                recentErrors,
                recentAuditLogs: auditPage.items,
                recentConfigVersions: configPage.items,
                environment: {
                    nodeEnv: process.env.NODE_ENV || "production",
                    pid: process.pid,
                    arch: process.arch,
                },
                triageChecklist: {
                    version: 2,
                    items: [
                        "1. Verificar status geral em payload.health.status - degraded ou unhealthy exige investigacao imediata",
                        "2. Revisar eventos bloqueados em payload.recentErrors - padroes repetidos indicam ataque ou misconfiguracao",
                        "3. Conferir consumo de armazenamento em payload.storage - alertar se uso ultrapassar threshold operacional",
                        "4. Avaliar SLO em payload.slo.status - rotas com status alerta requerem analise de latencia e taxa de erro",
                        "5. Analisar audit logs recentes em payload.recentAuditLogs em busca de atividades anomalas",
                        "6. Verificar versoes de configuracao em payload.recentConfigVersions - rollbacks nao autorizados sao sinal de incidente",
                        "7. Checar rate limiter em payload.rateLimiter - pico de rejeicoes pode indicar abuso ou sobrecarga",
                        "8. Confirmar telemetria ativa em payload.telemetry.enabled - desabilitada reduz visibilidade de incidentes",
                        "9. Registrar payload.traceId para correlacao com logs do servidor durante a investigacao",
                    ],
                    recommendations: triageRecommendations,
                },
                securityNote:
                    "Este pacote nao inclui: mensagens de chat, passphrases de backup, variaveis de ambiente sensiveis (segredos, tokens, senhas) nem dados de identificacao pessoal alem de userId em audit logs",
            };

            req.logger?.info({ traceId }, "Pacote de diagnostico exportado");

            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="diagnostics-${generatedAt.slice(0, 10)}.json"`,
            );
            return res.send(JSON.stringify(payload, null, 2));
        }),
    );
}
