export async function startConfiguredServer({
  port = 3001,
  createApp,
  initStoreDb,
  parsePositiveInt,
  scheduleBackupJob,
  startHttpServer,
  logger,
}) {
  await initStoreDb();

  const app = createApp();
  const intervalMinutes = parsePositiveInt(
    process.env.BACKUP_INTERVAL_MINUTES,
    0,
    0,
    24 * 60,
  );

  scheduleBackupJob({ app, intervalMinutes, logger });

  return startHttpServer({ app, port, logger });
}
