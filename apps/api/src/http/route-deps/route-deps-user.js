import { createRouteDeps } from "./route-deps-factory.js";

const USER_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "requireAdminOrSelf",
  "assertBodyObject",
  "parseUserId",
  "parseUserName",
  "parseUserRole",
  "parseChatId",
  "parseSystemPrompt",
  "parseTheme",
  "parseUiPreferences",
  "parseStorageLimitMb",
  "resolveActor",
  "recordAudit",
  "recordConfigVersion",
  "CONFIG_KEYS",
  "HttpError",
  "store",
];

export function buildUserRoutesDeps(ctx) {
  return createRouteDeps(ctx, USER_ROUTES_PROPS);
}