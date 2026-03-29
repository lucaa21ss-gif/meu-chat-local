import { createRouteDeps } from "./route-deps-factory.js";

const STORAGE_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "assertBodyObject",
  "parseUserId",
  "parseCleanupMode",
  "parseCleanupTarget",
  "parseCleanupOlderThanDays",
  "parseCleanupMaxDeleteMb",
  "parseCleanupPreserveValidatedBackups",
  "parseBackupPassphrase",
  "resolveActor",
  "requireOperationalApproval",
  "storageService",
  "store",
];

export function buildStorageRoutesDeps(ctx) {
  return createRouteDeps(ctx, STORAGE_ROUTES_PROPS);
}
