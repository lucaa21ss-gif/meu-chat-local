import { createRouteDeps } from "./route-deps-factory.js";

const CHATS_ROUTES_PROPS = [
  "asyncHandler",
  "assertBodyObject",
  "parseChatId",
  "parseTitle",
  "parseUserId",
  "parseChatListFilters",
  "parseBooleanLike",
  "parseTags",
  "parseSystemPrompt",
  "parseSearchQuery",
  "parseSearchPage",
  "parseSearchLimit",
  "parseSearchRole",
  "parseSearchDate",
  "parseChatImportPayload",
  "parseUserOnly",
  "recordBlockedAttempt",
  "resolveActor",
  "recordAudit",
  "recordConfigVersion",
  "requireMinimumRole",
  "CONFIG_KEYS",
  "store",
  "HttpError",
];

export function buildChatsRoutesDeps(ctx) {
  return createRouteDeps(ctx, CHATS_ROUTES_PROPS);
}
