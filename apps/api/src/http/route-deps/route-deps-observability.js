import { createRouteDeps } from "./route-deps-factory.js";

const OBSERVABILITY_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "recordAudit",
  "buildOverallHealthStatus",
  "buildSloSnapshot",
  "buildTriageRecommendations",
  "getTelemetryStats",
  "isTelemetryEnabled",
  "setTelemetryEnabled",
  "resetTelemetryStats",
  "healthProviders",
  "backupService",
  "integrityService",
  "capacityService",
  "baselineService",
  "autoHealingService",
  "incidentService",
  "queueService",
  "scorecardService",
  "approvalService",
  "storageService",
  "roleLimiter",
  "store",
];

export function buildObservabilityRoutesDeps(ctx) {
  return createRouteDeps(ctx, OBSERVABILITY_ROUTES_PROPS);
}
