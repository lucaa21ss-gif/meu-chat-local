export function createScheduledBackupDeps({ app, logger }) {
  return {
    app,
    logger,
  };
}

export function createStartServerDeps({ app, port, logger }) {
  return {
    app,
    port,
    logger,
  };
}