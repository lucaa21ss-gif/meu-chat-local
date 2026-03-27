export function createAppContextDeps({
  deps,
  store,
  serverDir,
  chatClient,
  logger,
  asyncHandler,
}) {
  return {
    deps,
    store,
    serverDir,
    chatClient,
    logger,
    asyncHandler,
  };
}

export function createAppBootstrapDeps({
  appContext,
  createHttpLogger,
  logger,
  express,
}) {
  return {
    corsOrigin: appContext.corsOrigin,
    webDir: appContext.webDir,
    roleLimiter: appContext.roleLimiter,
    createHttpLogger,
    logger,
    createTelemetryMiddleware: appContext.createTelemetryMiddleware,
    express,
  };
}

export function createAppLocalsDeps(appContext) {
  return {
    backupService: appContext.backupService,
    storageService: appContext.storageService,
    capacityService: appContext.capacityService,
    queueService: appContext.queueService,
    baselineService: appContext.baselineService,
    approvalService: appContext.approvalService,
  };
}
