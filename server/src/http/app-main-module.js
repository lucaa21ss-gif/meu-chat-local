import { fileURLToPath } from "node:url";
import logger from "../infra/logging/logger.js";

export function isMainModule(metaUrl, argv = process.argv) {
  return Boolean(argv[1] && fileURLToPath(metaUrl) === argv[1]);
}

export function runAsMainModule({
  metaUrl,
  startServer,
  logger: mainLogger = logger,
  exit = process.exit,
  argv = process.argv,
}) {
  if (!isMainModule(metaUrl, argv)) {
    return false;
  }

  startServer().catch((err) => {
    mainLogger.error(err, "Falha ao inicializar servidor");
    exit(1);
  });

  return true;
}
