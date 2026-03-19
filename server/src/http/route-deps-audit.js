import { createRouteDeps } from "./route-deps-factory.js";

const AUDIT_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "parseAuditFilters",
  "store",
];

export function buildAuditRoutesDeps(ctx) {
  return createRouteDeps(ctx, AUDIT_ROUTES_PROPS);
}