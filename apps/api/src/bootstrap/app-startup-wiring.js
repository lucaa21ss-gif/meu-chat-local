export function createScheduledBackupDeps({ app, logger }) {
  return {
    app,
    logger,
  };
}

export function createStartServerDeps({ app, port, host, logger }) {
  return {
    app,
    port,
    host,
    logger,
  };
}
