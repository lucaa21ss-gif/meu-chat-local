import { createRouteDeps } from "./route-deps-factory.js";

const CONFIG_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "resolveActor",
  "recordAudit",
  "recordConfigVersion",
  "parseConfigVersionFilters",
  "parseConfigVersionId",
  "areConfigValuesEqual",
  "readCurrentConfigValue",
  "applyConfigValue",
  "baselineService",
  "store",
  "HttpError",
];

export function buildConfigRoutesDeps(ctx) {
  return createRouteDeps(ctx, CONFIG_ROUTES_PROPS);
}
