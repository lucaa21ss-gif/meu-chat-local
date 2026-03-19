import express from "express";
import { client } from "../infra/ollama/ollama-client.js";
import logger, { createHttpLogger } from "../infra/logging/logger.js";
import { asyncHandler } from "./async-handler.js";
import { resolveServerDir } from "./app-paths.js";
import { createStore } from "./app-store.js";
import { createAppContext } from "./app-context.js";
import { attachAppLocals, configureAppBootstrap } from "./app-bootstrap.js";
import { registerAppRoutes } from "./register-app-routes.js";

export function createConfiguredApp(deps = {}) {
  const chatClient = deps.chatClient || client;
  const store = createStore(deps);

  const app = express();
  const serverDir = resolveServerDir(import.meta.url, deps.serverDir);
  const appContext = createAppContext({
    deps,
    store,
    serverDir,
    chatClient,
    logger,
    asyncHandler,
  });

  configureAppBootstrap(app, {
    corsOrigin: appContext.corsOrigin,
    webDir: appContext.webDir,
    roleLimiter: appContext.roleLimiter,
    createHttpLogger,
    logger,
    createTelemetryMiddleware: appContext.createTelemetryMiddleware,
    express,
  });

  attachAppLocals(app, {
    backupService: appContext.backupService,
    storageService: appContext.storageService,
    capacityService: appContext.capacityService,
    queueService: appContext.queueService,
    baselineService: appContext.baselineService,
    approvalService: appContext.approvalService,
  });

  registerAppRoutes(app, appContext.routeDeps);

  return app;
}