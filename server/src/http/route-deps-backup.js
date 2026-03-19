export function buildBackupRoutesDeps(ctx) {
  return {
    asyncHandler: ctx.asyncHandler,
    requireMinimumRole: ctx.requireMinimumRole,
    assertBodyObject: ctx.assertBodyObject,
    resolveActor: ctx.resolveActor,
    requireOperationalApproval: ctx.requireOperationalApproval,
    parseBackupPassphrase: ctx.parseBackupPassphrase,
    parseBackupPayload: ctx.parseBackupPayload,
    parsePositiveInt: ctx.parsePositiveInt,
    recordAudit: ctx.recordAudit,
    backupService: ctx.backupService,
    HttpError: ctx.HttpError,
  };
}
