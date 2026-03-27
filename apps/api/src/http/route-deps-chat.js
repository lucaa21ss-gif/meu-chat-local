import { createRouteDeps } from "./route-deps-factory.js";

const CHAT_ROUTES_PROPS = [
  "asyncHandler",
  "assertBodyObject",
  "parseMessage",
  "getChatId",
  "parseOptions",
  "parseRagOptions",
  "getMessageImages",
  "recordBlockedAttempt",
  "buildRagSystemMessage",
  "buildSystemMessages",
  "executeWithModelRecovery",
  "ollamaFallbackModel",
  "ollamaMaxAttempts",
  "ollamaTimeoutMs",
  "ollamaRetryDelays",
  "chatClient",
  "queueService",
  "store",
  "HttpError",
];

export function buildChatRoutesDeps(ctx) {
  return createRouteDeps(ctx, CHAT_ROUTES_PROPS);
}