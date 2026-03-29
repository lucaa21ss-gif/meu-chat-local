import logger from "../../../../platform/observability/logging/logger.js";
import { createConfiguredApp } from "../http/core/app-create.js";
import { initStoreDb } from "../../../../platform/persistence/sqlite/store.js";
import { scheduleBackupJobFromEnv } from "../../../../modules/backup/application/backup-scheduler.js";
import { startHttpServer } from "./app-server-listen.js";
import {
  createScheduledBackupDeps,
  createStartServerDeps,
} from "../bootstrap/app-startup-wiring.js";
import { AppLifecycle } from "../../../../platform/orchestration/lifecycle.js";
import { DesktopEnv } from "../../../../platform/orchestration/desktop-env.js";
import { closeDb } from "../../../../platform/persistence/sqlite/db.js";

const DESKTOP_MODE = process.env.DESKTOP_MODE === "true";

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
  port = 4000,
  host = process.env.HOST || "0.0.0.0",
  startupDeps,
}) {
  const {
    createApp,
    initStoreDb: runInitStoreDb,
    scheduleBackupJobFromEnv: runScheduleBackupJobFromEnv,
    startHttpServer: runStartHttpServer,
    logger: startupLogger,
  } = resolveStartupDeps(startupDeps);

  // 1. Inicializar o Lifecycle Manager
  const lifecycle = new AppLifecycle({ logger: startupLogger });

  // 2. Registrar o hook de fechamento do Banco de Dados (CRÍTICO para integridade)
  lifecycle.registerShutdownHook("sqlite-db", () => closeDb());

  // 3. Inicializar o Banco antes de tudo
  await runInitStoreDb();

  // 4. Criar a App Express
  const app = createApp();
  runScheduleBackupJobFromEnv(
    createScheduledBackupDeps({ app, logger: startupLogger }),
  );

  // 5. Subir o Servidor HTTP e registrar no Lifecycle
  const httpServer = runStartHttpServer(
    createStartServerDeps({ app, port, host, logger: startupLogger }),
  );
  lifecycle.registerHttpServer(httpServer);

  // 5.1 Otimização RAM/GPU: Derrubar requisições presas no provedor IA
  if (app.locals.chatClient && typeof app.locals.chatClient.cancelInFlightRequests === 'function') {
    lifecycle.registerShutdownHook("ai-provider-streams", () => {
      app.locals.chatClient.cancelInFlightRequests();
    });
  }

  // 6. Se DESKTOP_MODE=true, inicializar o Ollama e abrir o browser automaticamente
  if (DESKTOP_MODE) {
    startupLogger.info("[Startup] Modo Desktop ativado. Orquestrando ambiente...");
    const desktop = new DesktopEnv({ logger: startupLogger });
    
    // Inicia o Ollama e recebe o hook de encerramento para registrar
    const ollamaShutdownHook = await desktop.startOllama();
    lifecycle.registerShutdownHook("ollama", ollamaShutdownHook);

    // Aguarda o servidor estar "ouvindo" antes de abrir o browser
    httpServer.once("listening", async () => {
      await desktop.openBrowser(`http://localhost:${port}`);
    });
  }

  // 7. Armar os handlers de SIGINT/SIGTERM — a partir daqui o servidor é "gerenciado"
  lifecycle.listen();

  return httpServer;
}
