import { createIncidentRunbookSignalsCollector } from "../../../../modules/incident/application/incident-runbook-signals.js";

export function createIncidentSignalsRuntime({
  deps,
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
  return (
    deps.collectIncidentRunbookSignals ||
    createIncidentRunbookSignalsCollector({
      healthProviders,
      store,
      getTelemetryStats,
      backupService,
      roleLimiter,
      incidentService,
      buildOverallHealthStatus,
      buildSloSnapshot,
      buildTriageRecommendations,
    })
  );
}
