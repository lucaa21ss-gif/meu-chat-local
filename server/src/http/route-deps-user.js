export function buildUserRoutesDeps(ctx) {
  return {
    asyncHandler: ctx.asyncHandler,
    requireMinimumRole: ctx.requireMinimumRole,
    requireAdminOrSelf: ctx.requireAdminOrSelf,
    assertBodyObject: ctx.assertBodyObject,
    parseUserId: ctx.parseUserId,
    parseUserName: ctx.parseUserName,
    parseUserRole: ctx.parseUserRole,
    parseChatId: ctx.parseChatId,
    parseSystemPrompt: ctx.parseSystemPrompt,
    parseTheme: ctx.parseTheme,
    parseUiPreferences: ctx.parseUiPreferences,
    parseStorageLimitMb: ctx.parseStorageLimitMb,
    resolveActor: ctx.resolveActor,
    recordAudit: ctx.recordAudit,
    recordConfigVersion: ctx.recordConfigVersion,
    CONFIG_KEYS: ctx.CONFIG_KEYS,
    HttpError: ctx.HttpError,
    store: ctx.store,
  };
}