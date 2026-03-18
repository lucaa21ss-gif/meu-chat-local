import logger from "../../logger.js";
import { createConfiguredApp } from "./app-create.js";
import { initStoreDb } from "./app-store.js";
import { scheduleBackupJobFromEnv } from "./app-backup-scheduler.js";
import { startHttpServer } from "./app-server-listen.js";

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
  const deps = resolveStartupDeps(startupDeps);

  await deps.initStoreDb();

  const app = deps.createApp();
  deps.scheduleBackupJobFromEnv({ app, logger: deps.logger });

  return deps.startHttpServer({ app, port, logger: deps.logger });
}
