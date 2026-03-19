export function buildResilienceRoutesDeps(ctx) {
  return {
    asyncHandler: ctx.asyncHandler,
    requireMinimumRole: ctx.requireMinimumRole,
    assertBodyObject: ctx.assertBodyObject,
    resolveActor: ctx.resolveActor,
    recordAudit: ctx.recordAudit,
    requireOperationalApproval: ctx.requireOperationalApproval,
    parseAutoHealingConfigPatch: ctx.parseAutoHealingConfigPatch,
    parseAutoHealingPolicy: ctx.parseAutoHealingPolicy,
    parseDisasterScenarioId: ctx.parseDisasterScenarioId,
    parseBackupPassphrase: ctx.parseBackupPassphrase,
    parseBooleanLike: ctx.parseBooleanLike,
    autoHealingService: ctx.autoHealingService,
    disasterRecoveryService: ctx.disasterRecoveryService,
    integrityService: ctx.integrityService,
  };
}
