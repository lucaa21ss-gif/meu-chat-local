export function createAppContextValue({
  runtimeConfig,
  services,
  governanceRuntime,
  guardsAndAudit,
  createTelemetryMiddleware,
  routeDeps,
}) {
  return {
    ...runtimeConfig,
    ...services,
    ...governanceRuntime,
    ...guardsAndAudit,
    createTelemetryMiddleware,
    routeDeps,
  };
}