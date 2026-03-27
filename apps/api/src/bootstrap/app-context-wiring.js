export function createAppContextValue({ runtimeConfig, services, governanceRuntime, guardsAndAudit, createTelemetryMiddleware, routeDeps }) {
  return {
    // Flatten runtimeConfig to top level for easy access
    webDir: runtimeConfig.webDir,
    corsOrigin: runtimeConfig.corsOrigin,
    requestWindowMs: runtimeConfig.requestWindowMs,
    ollamaFallbackModel: runtimeConfig.ollamaFallbackModel,
    ollamaMaxAttempts: runtimeConfig.ollamaMaxAttempts,
    ollamaTimeoutMs: runtimeConfig.ollamaTimeoutMs,
    ollamaRetryDelays: runtimeConfig.ollamaRetryDelays,
    // Services
    backupService: services?.backupService,
    storageService: services?.storageService,
    capacityService: services?.capacityService,
    queueService: services?.queueService,
    baselineService: services?.baselineService,
    approvalService: services?.approvalService,
    // Governance
    roleLimiter: governanceRuntime?.roleLimiter,
    collectIncidentRunbookSignals: governanceRuntime?.collectIncidentRunbookSignals,
    // Guards
    ...guardsAndAudit,
    // Telemetry
    createTelemetryMiddleware,
    // Route deps
    routeDeps,
  };
}
