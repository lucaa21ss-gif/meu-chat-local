import { createIncidentRunbookSignalsCollector } from "../modules/governance/incident-runbook-signals.js";
import { createAppRoleLimiter } from "./app-role-limiter.js";

export function createGovernanceRuntime({
  deps,
  requestWindowMs,
  store,
  normalizeRole,
  getTelemetryStats,
  backupService,
  incidentService,
  healthProviders,
  buildOverallHealthStatus,
  buildSloSnapshot,
  buildTriageRecommendations,
}) {
  const roleLimiter = createAppRoleLimiter({
    deps,
    requestWindowMs,
    store,
    normalizeRole,
  });

  const collectIncidentRunbookSignals =
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
    });

  return {
    roleLimiter,
    collectIncidentRunbookSignals,
  };
}
