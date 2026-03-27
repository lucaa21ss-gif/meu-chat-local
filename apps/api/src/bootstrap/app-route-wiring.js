export function createRouteDepsForApp({ core, registrars, guards, runtime, services, parsers, features }) {
  const commonDeps = {
    ...core,
    ...guards,
    ...runtime,
    ...services,
    ...parsers,
    ...features,
  };

  return {
    ...registrars,
    webDir: core.webDir,
    adminWebDir: core.adminWebDir,
    HttpError: core.HttpError,
    healthRoutes: { ...commonDeps },
    chatRoutes: { ...commonDeps },
    ragRoutes: { ...commonDeps },
    userRoutes: { ...commonDeps },
    chatsRoutes: { ...commonDeps },
    backupRoutes: { ...commonDeps },
    incidentRoutes: { ...commonDeps },
    autoHealingRoutes: { ...commonDeps },
    integrityRoutes: { ...commonDeps },
    disasterRecoveryRoutes: { ...commonDeps },
    storageRoutes: { ...commonDeps },
    configRoutes: { ...commonDeps },
    approvalRoutes: { ...commonDeps },
    auditRoutes: { ...commonDeps },
    observabilityRoutes: { ...commonDeps },
  };
}
