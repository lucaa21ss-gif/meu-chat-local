import { fileURLToPath } from "node:url";
import logger from "../../../../platform/observability/logging/logger.js";
import { validateEnv } from "../../../../platform/config/env-validator.js";

// ── FAIL-FAST: Morrer cedo com mensagem clara é melhor que "undefined" no meio do chat ──
validateEnv();

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
