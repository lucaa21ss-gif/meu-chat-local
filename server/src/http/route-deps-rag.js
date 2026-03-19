export function buildRagRoutesDeps(ctx) {
  return {
    asyncHandler: ctx.asyncHandler,
    assertBodyObject: ctx.assertBodyObject,
    parseChatId: ctx.parseChatId,
    parseRagDocuments: ctx.parseRagDocuments,
    parseSearchQuery: ctx.parseSearchQuery,
    recordBlockedAttempt: ctx.recordBlockedAttempt,
    clamp: ctx.clamp,
    store: ctx.store,
  };
}