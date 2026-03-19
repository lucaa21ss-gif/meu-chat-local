import { createRouteDeps } from "./route-deps-factory.js";

const BACKUP_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "assertBodyObject",
  "resolveActor",
  "requireOperationalApproval",
  "parseBackupPassphrase",
  "parseBackupPayload",
  "parsePositiveInt",
  "recordAudit",
  "backupService",
  "HttpError",
];

export function buildBackupRoutesDeps(ctx) {
  return createRouteDeps(ctx, BACKUP_ROUTES_PROPS);
}
