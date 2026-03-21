import { createRouteDeps } from "./route-deps-factory.js";

const DISASTER_RECOVERY_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "assertBodyObject",
  "resolveActor",
  "recordAudit",
  "requireOperationalApproval",
  "parseDisasterScenarioId",
  "parseBackupPassphrase",
  "disasterRecoveryService",
];

export function buildDisasterRecoveryRoutesDeps(ctx) {
  return createRouteDeps(ctx, DISASTER_RECOVERY_ROUTES_PROPS);
}
