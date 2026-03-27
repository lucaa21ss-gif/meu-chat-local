import { createRouteDeps } from "./route-deps-factory.js";

const HEALTH_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "assertBodyObject",
  "parseBooleanLike",
  "resolveActor",
  "recordAudit",
  "recordConfigVersion",
  "buildOverallHealthStatus",
  "buildSloSnapshot",
  "getTelemetryStats",
  "isTelemetryEnabled",
  "setTelemetryEnabled",
  "resetTelemetryStats",
  "HEALTH_STATUS",
  "healthProviders",
  "integrityService",
  "autoHealingService",
  "capacityService",
  "queueService",
  "baselineService",
  "roleLimiter",
  "CONFIG_KEYS",
  "store",
];

export function buildHealthRoutesDeps(ctx) {
  return createRouteDeps(ctx, HEALTH_ROUTES_PROPS);
}