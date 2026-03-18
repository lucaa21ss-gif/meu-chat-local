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