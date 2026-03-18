export function createIncidentRunbookSignalsCollector({
  healthProviders,
  store,
  getTelemetryStats,
  backupService,
  roleLimiter,
  incidentService,
  buildOverallHealthStatus,
  buildSloSnapshot,
  buildTriageRecommendations,
}) {
  return async function collectIncidentRunbookSignals({ backupPassphrase = null } = {}) {
    const [healthDb, healthModel, healthDisk, auditPage] = await Promise.all([
      healthProviders.checkDb(),
      healthProviders.checkModel(),
      healthProviders.checkDisk(),
      store.listAuditLogs({ page: 1, limit: 50 }),
    ]);

    const telemetryStats = getTelemetryStats().map((item) => ({
      ...item,
      errorRate: item.count ? Math.round((item.errors / item.count) * 100) : 0,
    }));

    const backupValidation = await backupService
      .validateRecentBackups({ limit: 3, passphrase: backupPassphrase })
      .catch((error) => ({
        checkedAt: new Date().toISOString(),
        limit: 3,
        status: "falha",
        items: [],
        error: String(error?.message || "Falha ao validar backups"),
      }));

    const rateLimiter = roleLimiter.getMetrics();
    const recentErrors = auditPage.items
      .filter(
        (entry) =>
          typeof entry.eventType === "string" &&
          (entry.eventType.includes("blocked") || entry.eventType.includes("error")),
      )
      .slice(0, 20);

    const health = {
      status: buildOverallHealthStatus({ db: healthDb, model: healthModel, disk: healthDisk }),
      checks: { db: healthDb, model: healthModel, disk: healthDisk },
    };
    const slo = buildSloSnapshot(telemetryStats);
    const incidentStatus = incidentService.getStatus();
    const recommendations = buildTriageRecommendations({
      health,
      slo,
      backupValidation,
      rateLimiter,
      recentErrors,
      incidentStatus,
    });

    return {
      health,
      slo,
      backupValidation,
      rateLimiter,
      recentErrors,
      incidentStatus,
      recommendations,
    };
  };
}
