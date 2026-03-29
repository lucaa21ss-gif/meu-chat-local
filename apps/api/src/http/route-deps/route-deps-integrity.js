import { createRouteDeps } from "./route-deps-factory.js";

const INTEGRITY_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "resolveActor",
  "recordAudit",
  "parseBooleanLike",
  "integrityService",
];

export function buildIntegrityRoutesDeps(ctx) {
  return createRouteDeps(ctx, INTEGRITY_ROUTES_PROPS);
}
