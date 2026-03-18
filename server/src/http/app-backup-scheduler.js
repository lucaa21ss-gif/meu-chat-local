export function scheduleBackupJob({ app, intervalMinutes, logger }) {
  if (intervalMinutes <= 0 || !app?.locals?.backupService?.createBackup) {
    return null;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  const timer = setInterval(async () => {
    try {
      const backup = await app.locals.backupService.createBackup();
      logger.info(
        { fileName: backup.fileName, sizeBytes: backup.sizeBytes },
        "Backup agendado concluido",
      );
    } catch (error) {
      logger.error({ error: error.message }, "Falha no backup agendado");
    }
  }, intervalMs);
  timer.unref();
  logger.info(
    { intervalMinutes },
    "Backup agendado habilitado por BACKUP_INTERVAL_MINUTES",
  );
  return timer;
}
