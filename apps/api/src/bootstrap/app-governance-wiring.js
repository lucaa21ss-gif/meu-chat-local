export function createGovernanceDepsForApp({ core, services, builders }) {
  return {
    deps: core.deps,
    requestWindowMs: core.requestWindowMs,
    store: core.store,
    normalizeRole: core.normalizeRole,
    getTelemetryStats: core.getTelemetryStats,
    backupService: services?.backupService,
    incidentService: services?.incidentService,
    healthProviders: services?.healthProviders,
    buildOverallHealthStatus: builders?.buildOverallHealthStatus,
    buildSloSnapshot: builders?.buildSloSnapshot,
    buildTriageRecommendations: builders?.buildTriageRecommendations,
  };
}
