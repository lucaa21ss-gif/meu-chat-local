export function buildConfigRoutesDeps(ctx) {
  return {
    asyncHandler: ctx.asyncHandler,
    requireMinimumRole: ctx.requireMinimumRole,
    resolveActor: ctx.resolveActor,
    recordAudit: ctx.recordAudit,
    recordConfigVersion: ctx.recordConfigVersion,
    parseConfigVersionFilters: ctx.parseConfigVersionFilters,
    parseConfigVersionId: ctx.parseConfigVersionId,
    areConfigValuesEqual: ctx.areConfigValuesEqual,
    readCurrentConfigValue: ctx.readCurrentConfigValue,
    applyConfigValue: ctx.applyConfigValue,
    baselineService: ctx.baselineService,
    store: ctx.store,
    HttpError: ctx.HttpError,
  };
}
