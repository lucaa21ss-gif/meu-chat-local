export function buildAuditRoutesDeps(ctx) {
  return {
    asyncHandler: ctx.asyncHandler,
    requireMinimumRole: ctx.requireMinimumRole,
    parseAuditFilters: ctx.parseAuditFilters,
    store: ctx.store,
  };
}