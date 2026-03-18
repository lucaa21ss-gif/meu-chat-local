import { createRoleLimiterQueue } from "../../rateLimiter.js";
import { createIncidentRunbookSignalsCollector } from "../modules/governance/incident-runbook-signals.js";

export function createGovernanceRuntime({
  deps,
  requestWindowMs,
  store,
  normalizeRole,
  parsePositiveInt,
  getTelemetryStats,
  backupService,
  incidentService,
  healthProviders,
  buildOverallHealthStatus,
  buildSloSnapshot,
  buildTriageRecommendations,
}) {
  const roleLimits = deps.roleLimits ?? {
    admin: { windowMs: requestWindowMs, max: 300, chatMax: 100 },
    operator: { windowMs: requestWindowMs, max: 150, chatMax: 50 },
    viewer: { windowMs: requestWindowMs, max: 60, chatMax: 20 },
  };

  const roleLimiter = deps.roleLimiter ??
    createRoleLimiterQueue({
      roleLimits,
      queueMax: Number.parseInt(process.env.RATE_LIMIT_QUEUE_MAX || "30", 10),
      queueTimeoutMs: Number.parseInt(
        process.env.RATE_LIMIT_QUEUE_TIMEOUT_MS || "8000",
        10,
      ),
      getRoleForUser: async (userId) => {
        try {
          const user = await store.getUserById(userId);
          return normalizeRole(user?.role, "viewer");
        } catch {
          return "viewer";
        }
      },
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
