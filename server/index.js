import { fileURLToPath } from "node:url";
import logger from "./logger.js";
import { parsePositiveInt } from "./src/shared/parsers.js";
import { initStoreDb } from "./src/http/app-store.js";
import { scheduleBackupJob } from "./src/http/app-backup-scheduler.js";
import { startHttpServer } from "./src/http/app-server-listen.js";
import { createConfiguredApp } from "./src/http/app-factory.js";
import { createIntegrityRuntimeService } from "./src/modules/governance/integrity-service.js";

export { createIntegrityRuntimeService };

export function createApp(deps = {}) {
  return createConfiguredApp(deps);
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

  const server = startHttpServer({ app, port, logger });
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
