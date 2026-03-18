import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { client } from "./ollama.js";
import logger, { createHttpLogger } from "./logger.js";
import { parsePositiveInt } from "./src/shared/parsers.js";
import { asyncHandler } from "./src/http/async-handler.js";
import { createStore, initStoreDb } from "./src/http/app-store.js";
import { APP_ROUTE_REGISTRARS } from "./src/http/app-route-registrars.js";
import { scheduleBackupJob } from "./src/http/app-backup-scheduler.js";
import { createAppContext } from "./src/http/app-context.js";
import { attachAppLocals, configureAppBootstrap } from "./src/http/app-bootstrap.js";
import { registerAppRoutes } from "./src/http/register-app-routes.js";
import { createIntegrityRuntimeService } from "./src/modules/governance/integrity-service.js";

export { createIntegrityRuntimeService };

export function createApp(deps = {}) {
  const chatClient = deps.chatClient || client;
  const store = createStore(deps);

  const app = express();
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  const {
    webDir,
    corsOrigin,
    backupService,
    storageService,
    capacityService,
    queueService,
    baselineService,
    approvalService,
    roleLimiter,
    createTelemetryMiddleware,
    routeDeps,
  } = createAppContext({
    deps,
    store,
    serverDir,
    chatClient,
    logger,
    asyncHandler,
    parsePositiveInt,
    requestWindowMsFallback: Number.parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`,
      10,
    ),
    registrars: APP_ROUTE_REGISTRARS,
  });

  configureAppBootstrap(app, {
    corsOrigin,
    webDir,
    roleLimiter,
    createHttpLogger,
    logger,
    createTelemetryMiddleware,
    express,
  });

  attachAppLocals(app, {
    backupService,
    storageService,
    capacityService,
    queueService,
    baselineService,
    approvalService,
  });

  registerAppRoutes(app, routeDeps);

  return app;
}

export async function startServer(port = 3001) {
  await initStoreDb();
  const app = createApp();
  const intervalMinutes = parsePositiveInt(
    process.env.BACKUP_INTERVAL_MINUTES,
    0,
    0,
    24 * 60,
  );

  scheduleBackupJob({ app, intervalMinutes, logger });

  const server = app.listen(port, () => {
    logger.info(`API rodando em http://localhost:${port}`);
  });
  return server;
}

const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  startServer().catch((err) => {
    logger.error(err, "Falha ao inicializar servidor");
    process.exit(1);
  });
}
