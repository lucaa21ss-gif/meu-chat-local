export function createServiceDepsForApp({ core, runtime, parsers, features }) {
  return {
    deps: core.deps,
    store: core.store,
    serverDir: core.serverDir,
    chatClient: core.chatClient,
    ollamaFallbackModel: runtime?.ollamaFallbackModel,
    ollamaMaxAttempts: runtime?.ollamaMaxAttempts,
    ollamaTimeoutMs: runtime?.ollamaTimeoutMs,
    ollamaRetryDelays: runtime?.ollamaRetryDelays,
    parsers,
    isTelemetryEnabled: features?.isTelemetryEnabled,
    setTelemetryEnabled: features?.setTelemetryEnabled,
    resetTelemetryStats: features?.resetTelemetryStats,
    CONFIG_KEYS: features?.CONFIG_KEYS,
  };
}
