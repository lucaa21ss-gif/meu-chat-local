import { createRouteDeps } from "./route-deps-factory.js";

const RAG_ROUTES_PROPS = [
  "asyncHandler",
  "assertBodyObject",
  "parseChatId",
  "parseRagDocuments",
  "parseSearchQuery",
  "recordBlockedAttempt",
  "clamp",
  "store",
];

export function buildRagRoutesDeps(ctx) {
  return createRouteDeps(ctx, RAG_ROUTES_PROPS);
}