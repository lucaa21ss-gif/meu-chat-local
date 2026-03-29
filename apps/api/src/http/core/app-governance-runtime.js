import { createAppRoleLimiter } from "../../../../../modules/users/application/role-limiter.js";
import { createIncidentSignalsRuntime } from "./app-incident-signals-runtime.js";

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

  const collectIncidentRunbookSignals = createIncidentSignalsRuntime({
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
  });

  return {
    roleLimiter,
    collectIncidentRunbookSignals,
  };
}
