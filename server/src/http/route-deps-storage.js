export function buildStorageRoutesDeps(ctx) {
  return {
    asyncHandler: ctx.asyncHandler,
    requireMinimumRole: ctx.requireMinimumRole,
    assertBodyObject: ctx.assertBodyObject,
    parseUserId: ctx.parseUserId,
    parseCleanupMode: ctx.parseCleanupMode,
    parseCleanupTarget: ctx.parseCleanupTarget,
    parseCleanupOlderThanDays: ctx.parseCleanupOlderThanDays,
    parseCleanupMaxDeleteMb: ctx.parseCleanupMaxDeleteMb,
    parseCleanupPreserveValidatedBackups: ctx.parseCleanupPreserveValidatedBackups,
    parseBackupPassphrase: ctx.parseBackupPassphrase,
    resolveActor: ctx.resolveActor,
    requireOperationalApproval: ctx.requireOperationalApproval,
    storageService: ctx.storageService,
    store: ctx.store,
  };
}
