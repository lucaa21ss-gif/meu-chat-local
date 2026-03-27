export function registerObservabilityRoutes(app, deps = {}) {
  const {
    asyncHandler,
    getTelemetryStats,
    isTelemetryEnabled,
    setTelemetryEnabled,
    resetTelemetryStats,
    requireMinimumRole,
    recordAudit,
    buildOverallHealthStatus,
    buildSloSnapshot,
    buildTriageRecommendations,
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
    "/api/observability/telemetry",
    asyncHandler(async (req, res) => {
      const stats = getTelemetryStats ? getTelemetryStats() : [];
      res.json({ enabled: isTelemetryEnabled ? isTelemetryEnabled() : false, routes: stats });
    }),
  );

  app.post(
    "/api/observability/telemetry/toggle",
    asyncHandler(async (req, res) => {
      const enabled = req.body?.enabled === true;
      if (setTelemetryEnabled) setTelemetryEnabled(enabled);
      res.json({ ok: true, enabled });
    }),
  );

  app.post(
    "/api/observability/telemetry/reset",
    asyncHandler(async (req, res) => {
      if (resetTelemetryStats) resetTelemetryStats();
      res.json({ ok: true });
    }),
  );

  app.post(
    "/api/observability/gc",
    requireMinimumRole ? requireMinimumRole("admin") : (req, res, next) => next(),
    asyncHandler(async (req, res) => {
      const before = process.memoryUsage().heapUsed;
      if (global.gc) {
        global.gc();
        const after = process.memoryUsage().heapUsed;
        const freedMb = ((before - after) / 1024 / 1024).toFixed(2);
        res.json({ ok: true, forced: true, freedMb, currentMemory: process.memoryUsage() });
      } else {
        res.json({ ok: true, forced: false, message: "Garbage Collector não exposto (use --expose-gc)", currentMemory: process.memoryUsage() });
      }
    }),
  );

  // GET /api/diagnostics/export - pacote forense completo para diagnóstico
  app.get(
    "/api/diagnostics/export",
    requireMinimumRole ? requireMinimumRole("operator") : (req, res, next) => next(),
    asyncHandler(async (req, res) => {
      const traceId = req.id || req.headers["x-trace-id"] || "unknown";
      const generatedAt = new Date().toISOString();
      const timestamp = generatedAt.replace(/[:.]/g, "-").slice(0, 19);

      // Coleta dados em paralelo
      const [
        dbCheck,
        modelCheck,
        diskCheck,
        backupValidation,
        capacity,
        autoHealing,
        incident,
        storageUsage,
        auditLogs,
        configVersions,
        queueMetrics,
      ] = await Promise.all([
        healthProviders?.checkDb?.() || Promise.resolve({ status: "healthy" }),
        healthProviders?.checkModel?.() || Promise.resolve({ status: "healthy" }),
        healthProviders?.checkDisk?.() || Promise.resolve({ status: "healthy" }),
        backupService?.validateRecentBackups?.({ limit: 3 }) || Promise.resolve({ status: "ok", items: [] }),
        capacityService?.getLatestSummary?.() || Promise.resolve(null),
        autoHealingService?.getStatus?.() || Promise.resolve({ enabled: true }),
        incidentService?.getStatus?.() || Promise.resolve({ status: "normal" }),
        storageService?.getUsage?.() || Promise.resolve({ dbBytes: 0, uploadsBytes: 0, documentsBytes: 0, backupsBytes: 0, totalBytes: 0 }),
        store?.audit?.listRecent?.(10) || Promise.resolve([]),
        store?.config?.listVersions?.(10) || Promise.resolve([]),
        Promise.resolve(queueService?.getMetrics?.() || { activeCount: 0, queuedCount: 0, rejectedCount: 0 }),
      ]);

      const telemetryStats = getTelemetryStats?.() || [];
      const slo = buildSloSnapshot ? buildSloSnapshot(telemetryStats) : { status: "ok", evaluatedRoutes: [] };
      const health = {
        status: buildOverallHealthStatus ? buildOverallHealthStatus({ db: dbCheck, model: modelCheck, disk: diskCheck }) : "healthy",
        checks: { db: dbCheck, model: modelCheck, disk: diskCheck },
      };

      const triageItems = [
        "Verificar status de saude do banco de dados",
        "Verificar disponibilidade do modelo de linguagem",
        "Verificar espaco em disco disponivel",
        "Verificar backups recentes e integridade",
        "Analisar logs de erros recentes",
        "Verificar filas e processamento pendente",
        "Revisar configuracoes e governanca",
      ];

      const triageRecommendations = buildTriageRecommendations
        ? buildTriageRecommendations({ health, slo, capacity, incident })
        : [];

      // Filtra segredos do environment
      const safeEnvKeys = ["NODE_ENV", "PORT", "HOSTNAME", "npm_lifecycle_event"];
      const safeEnvironment = Object.fromEntries(
        Object.entries(process.env).filter(([k]) =>
          safeEnvKeys.includes(k) ||
          (!k.toLowerCase().includes("secret") &&
           !k.toLowerCase().includes("password") &&
           !k.toLowerCase().includes("token") &&
           !k.toLowerCase().includes("key") &&
           !k.toLowerCase().includes("auth") &&
           !k.toLowerCase().includes("credential") &&
           !k.startsWith("_TEST_"))
        )
      );

      const payload = {
        version: 2,
        generatedAt,
        traceId,
        app: {
          name: "meu-chat-local",
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || "production",
          pid: process.pid,
          ...safeEnvironment,
        },
        health,
        slo: {
          status: slo?.status || "ok",
          evaluatedRoutes: slo?.routes || slo?.evaluatedRoutes || [],
        },
        rateLimiter: roleLimiter ? { configured: true } : { configured: false },
        telemetry: {
          enabled: isTelemetryEnabled ? isTelemetryEnabled() : false,
          stats: telemetryStats,
        },
        storage: storageUsage,
        backupValidation: {
          status: backupValidation?.status || "ok",
          items: backupValidation?.items || [],
          checkedAt: backupValidation?.checkedAt || generatedAt,
        },
        incidentStatus: {
          status: incident?.status || "normal",
          ...incident,
        },
        autoHealing: {
          enabled: autoHealing?.enabled !== undefined ? autoHealing.enabled : true,
          ...autoHealing,
        },
        capacity: capacity || null,
        queue: {
          activeCount: queueMetrics?.activeCount ?? 0,
          queuedCount: queueMetrics?.queuedCount ?? 0,
          rejectedCount: queueMetrics?.rejectedCount ?? 0,
          ...(queueMetrics || {}),
        },
        recentAuditLogs: Array.isArray(auditLogs) ? auditLogs : [],
        recentConfigVersions: Array.isArray(configVersions) ? configVersions : [],
        recentErrors: [],
        triageChecklist: {
          version: 2,
          items: triageItems,
          recommendations: Array.isArray(triageRecommendations) ? triageRecommendations : [],
        },
        securityNote: "Este pacote contem dados sensiveis. Nao compartilhe com terceiros nao autorizados.",
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="diagnostics-${timestamp}.json"`);
      res.setHeader("x-trace-id", traceId);
      return res.status(200).send(JSON.stringify(payload));
    }),
  );

  // GET /api/scorecard - consolidates health from multiple sources
  app.get(
    "/api/scorecard",
    requireMinimumRole ? requireMinimumRole("operator") : (req, res, next) => next(),
    asyncHandler(async (req, res) => {
      const actor = req.headers["x-user-id"] || "user-default";

      // Gather all required data in parallel
      const [
        dbCheck,
        modelCheck,
        diskCheck,
        integrityStatus,
        backupValidation,
        capacityStatus,
        autoHealingStatus,
        incident,
        baseline,
        queue,
      ] = await Promise.all([
        healthProviders?.checkDb?.() || Promise.resolve({ status: "healthy" }),
        healthProviders?.checkModel?.() || Promise.resolve({ status: "healthy" }),
        healthProviders?.checkDisk?.() || Promise.resolve({ status: "healthy" }),
        integrityService?.getOrRefresh?.() || Promise.resolve({ status: "ok" }),
        backupService?.validateRecentBackups?.({ limit: 3 }) || Promise.resolve({ status: "ok" }),
        capacityService?.getLatestSummary?.() || Promise.resolve({ status: "approved" }),
        autoHealingService?.getStatus?.() || Promise.resolve({ enabled: true }),
        incidentService?.getStatus?.() || Promise.resolve({ status: "normal" }),
        baselineService?.check?.() || Promise.resolve({ status: "ok" }),
        queueService?.getMetrics?.() || Promise.resolve({ activeCount: 0 }),
      ]);

      // Build scorecard using scorecardService.generate()
      const health = buildOverallHealthStatus ? buildOverallHealthStatus({ db: dbCheck, model: modelCheck, disk: diskCheck }) : "healthy";
      const pendingApprovalsCount = (await approvalService?.list?.({ status: "pending" }))?.total || 0;

      const scorecard = await scorecardService.generate({
        health: { status: health, checks: { db: dbCheck, model: modelCheck, disk: diskCheck } },
        slo: buildSloSnapshot ? buildSloSnapshot(getTelemetryStats?.() || []) : { status: "ok" },
        backupValidation,
        integrity: integrityStatus,
        capacity: capacityStatus,
        autoHealing: autoHealingStatus,
        incident,
        baseline,
        pendingApprovals: pendingApprovalsCount,
        queue,
      });

      await recordAudit?.("scorecard.generated", actor, { status: scorecard.status });
      res.json({ scorecard });
    }),
  );

  // GET /api/capacity/latest - returns latest capacity report summary
  app.get(
    "/api/capacity/latest",
    requireMinimumRole ? requireMinimumRole("operator") : (req, res, next) => next(),
    asyncHandler(async (req, res) => {
      const actor = req.headers["x-user-id"] || "user-default";

      const capacity = await capacityService?.getLatestSummary?.() || {
        status: "pending",
        reason: "nenhum relatorio disponivel",
      };

      await recordAudit?.("capacity.retrieved", actor, { status: capacity.status });
      res.json({ capacity });
    }),
  );
}
