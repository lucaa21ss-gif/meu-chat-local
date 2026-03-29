import express from "express";
import { AIFactory } from "../../../../../platform/llm/ai-factory.js";
import logger, { createHttpLogger } from "../../../../../platform/observability/logging/logger.js";
import { asyncHandler } from "./async-handler.js";
import { resolveServerDir } from "./app-paths.js";
import {
  createAppBootstrapDeps,
  createAppContextDeps,
  createAppLocalsDeps,
} from "../../bootstrap/app-create-wiring.js";
import { createStore } from "../../../../../platform/persistence/sqlite/store.js";
import { createAppContext } from "./app-context.js";
import { attachAppLocals, configureAppBootstrap } from "./app-bootstrap.js";
import { registerAppRoutes } from "../routes/register-app-routes.js";

export function createConfiguredApp(deps = {}) {
  const chatClient = deps.chatClient || AIFactory.createProvider();
  const store = createStore(deps);

  const app = express();
  const serverDir = resolveServerDir(import.meta.url, deps.serverDir);
  const appContext = createAppContext(
    createAppContextDeps({
      deps,
      store,
      serverDir,
      chatClient,
      logger,
      asyncHandler,
    }),
  );

  configureAppBootstrap(
    app,
    createAppBootstrapDeps({
      appContext,
      createHttpLogger,
      logger,
      express,
    }),
  );

  attachAppLocals(app, createAppLocalsDeps(appContext));

  registerAppRoutes(app, appContext.routeDeps);

  return app;
}