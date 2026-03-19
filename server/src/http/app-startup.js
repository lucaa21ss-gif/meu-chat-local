import logger from "../infra/logging/logger.js";
import { createConfiguredApp } from "./app-create.js";
import { initStoreDb } from "./app-store.js";
import { scheduleBackupJobFromEnv } from "./app-backup-scheduler.js";
import { startHttpServer } from "./app-server-listen.js";
import {
  createScheduledBackupDeps,
  createStartServerDeps,
} from "./app-startup-wiring.js";

function resolveStartupDeps(startupDeps = {}) {
  return {
    createApp: startupDeps.createApp || createConfiguredApp,
    initStoreDb: startupDeps.initStoreDb || initStoreDb,
    scheduleBackupJobFromEnv:
      startupDeps.scheduleBackupJobFromEnv || scheduleBackupJobFromEnv,
    startHttpServer: startupDeps.startHttpServer || startHttpServer,
    logger: startupDeps.logger || logger,
  };
}

export async function startConfiguredServer({
  port = 3001,
  startupDeps,
}) {
  const {
    createApp,
    initStoreDb: runInitStoreDb,
    scheduleBackupJobFromEnv: runScheduleBackupJobFromEnv,
    startHttpServer: runStartHttpServer,
    logger: startupLogger,
  } = resolveStartupDeps(startupDeps);

  await runInitStoreDb();

  const app = createApp();
  runScheduleBackupJobFromEnv(
    createScheduledBackupDeps({ app, logger: startupLogger }),
  );

  return runStartHttpServer(
    createStartServerDeps({ app, port, logger: startupLogger }),
  );
}
