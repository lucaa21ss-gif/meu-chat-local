import { createRouteDeps } from "./route-deps-factory.js";

const AUTO_HEALING_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "assertBodyObject",
  "resolveActor",
  "recordAudit",
  "parseAutoHealingConfigPatch",
  "parseAutoHealingPolicy",
  "autoHealingService",
];

export function buildAutoHealingRoutesDeps(ctx) {
  return createRouteDeps(ctx, AUTO_HEALING_ROUTES_PROPS);
}
