import { createRouteDeps } from "./route-deps-factory.js";

const RESILIENCE_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "assertBodyObject",
  "resolveActor",
  "recordAudit",
  "requireOperationalApproval",
  "parseAutoHealingConfigPatch",
  "parseAutoHealingPolicy",
  "parseDisasterScenarioId",
  "parseBackupPassphrase",
  "parseBooleanLike",
  "autoHealingService",
  "disasterRecoveryService",
  "integrityService",
];

export function buildResilienceRoutesDeps(ctx) {
  return createRouteDeps(ctx, RESILIENCE_ROUTES_PROPS);
}
