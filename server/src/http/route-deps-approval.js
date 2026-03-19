export function buildApprovalRoutesDeps(ctx) {
  return {
    asyncHandler: ctx.asyncHandler,
    requireMinimumRole: ctx.requireMinimumRole,
    assertBodyObject: ctx.assertBodyObject,
    resolveActor: ctx.resolveActor,
    recordAudit: ctx.recordAudit,
    parseOperationalApprovalStatus: ctx.parseOperationalApprovalStatus,
    parsePositiveInt: ctx.parsePositiveInt,
    parseOperationalApprovalAction: ctx.parseOperationalApprovalAction,
    parseOperationalApprovalReason: ctx.parseOperationalApprovalReason,
    parseOperationalApprovalWindowMinutes: ctx.parseOperationalApprovalWindowMinutes,
    parseOperationalApprovalId: ctx.parseOperationalApprovalId,
    parseOperationalApprovalDecision: ctx.parseOperationalApprovalDecision,
    approvalService: ctx.approvalService,
  };
}
