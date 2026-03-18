import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { client } from "../../ollama.js";
import logger, { createHttpLogger } from "../../logger.js";
import { asyncHandler } from "./async-handler.js";
import { createStore } from "./app-store.js";
import { APP_ROUTE_REGISTRARS } from "./app-route-registrars.js";
import { createAppContext } from "./app-context.js";
import { attachAppLocals, configureAppBootstrap } from "./app-bootstrap.js";
import { registerAppRoutes } from "./register-app-routes.js";

export function createConfiguredApp(deps = {}) {
  const chatClient = deps.chatClient || client;
  const store = createStore(deps);

  const app = express();
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const serverDir = deps.serverDir || path.resolve(moduleDir, "..", "..");
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
