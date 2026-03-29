import { parsePositiveInt } from "../../../shared/config/parsers.js";

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

export function scheduleBackupJobFromEnv({
  app,
  logger,
  env = process.env,
  parseInterval = parsePositiveInt,
}) {
  const intervalMinutes = parseInterval(
    env.BACKUP_INTERVAL_MINUTES,
    0,
    0,
    24 * 60,
  );
  return scheduleBackupJob({ app, intervalMinutes, logger });
}
