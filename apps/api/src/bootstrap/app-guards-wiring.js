export function createGuardsAndAuditDepsForApp({ core, services, parsers }) {
  return {
    store: core.store,
    logger: core.logger,
    configRollbackService: services?.configRollbackService,
    approvalService: services?.approvalService,
    parseUserId: parsers?.parseUserId,
    normalizeRole: parsers?.normalizeRole,
    hasRequiredRole: parsers?.hasRequiredRole,
    asyncHandler: core.asyncHandler,
    HttpError: core.HttpError,
    parseOperationalApprovalId: parsers?.parseOperationalApprovalId,
  };
}
