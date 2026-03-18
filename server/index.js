import { fileURLToPath } from "node:url";
import logger from "./logger.js";
import { parsePositiveInt } from "./src/shared/parsers.js";
import { initStoreDb } from "./src/http/app-store.js";
import { scheduleBackupJob } from "./src/http/app-backup-scheduler.js";
import { startHttpServer } from "./src/http/app-server-listen.js";
import { createConfiguredApp } from "./src/http/app-factory.js";
import { startConfiguredServer } from "./src/http/app-startup.js";
import { createIntegrityRuntimeService } from "./src/modules/governance/integrity-service.js";

export { createIntegrityRuntimeService };

export function createApp(deps = {}) {
  return createConfiguredApp(deps);
}

export async function startServer(port = 3001) {
  return startConfiguredServer({
    port,
    createApp,
    initStoreDb,
    parsePositiveInt,
    scheduleBackupJob,
    startHttpServer,
    logger,
  });
}

const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  startServer().catch((err) => {
    logger.error(err, "Falha ao inicializar servidor");
    process.exit(1);
  });
}
