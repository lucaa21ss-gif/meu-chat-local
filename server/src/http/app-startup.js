import logger from "../../logger.js";
import { parsePositiveInt } from "../shared/parsers.js";
import { createConfiguredApp } from "./app-factory.js";
import { initStoreDb } from "./app-store.js";
import { scheduleBackupJob } from "./app-backup-scheduler.js";
import { startHttpServer } from "./app-server-listen.js";

function resolveStartupDeps(startupDeps = {}) {
  return {
    createApp: startupDeps.createApp || createConfiguredApp,
    initStoreDb: startupDeps.initStoreDb || initStoreDb,
    parsePositiveInt: startupDeps.parsePositiveInt || parsePositiveInt,
    scheduleBackupJob: startupDeps.scheduleBackupJob || scheduleBackupJob,
    startHttpServer: startupDeps.startHttpServer || startHttpServer,
    logger: startupDeps.logger || logger,
  };
}

export async function startConfiguredServer({
  port = 3001,
  startupDeps,
}) {
  const deps = resolveStartupDeps(startupDeps);

  await deps.initStoreDb();

  const app = deps.createApp();
  const intervalMinutes = deps.parsePositiveInt(
    process.env.BACKUP_INTERVAL_MINUTES,
    0,
    0,
    24 * 60,
  );

  deps.scheduleBackupJob({ app, intervalMinutes, logger: deps.logger });

  return deps.startHttpServer({ app, port, logger: deps.logger });
}
