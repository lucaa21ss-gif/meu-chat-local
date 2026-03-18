import { fileURLToPath } from "node:url";

export function isMainModule(metaUrl, argv = process.argv) {
  return Boolean(argv[1] && fileURLToPath(metaUrl) === argv[1]);
}

export function runAsMainModule({
  metaUrl,
  startServer,
  logger,
  exit = process.exit,
  argv = process.argv,
}) {
  if (!isMainModule(metaUrl, argv)) {
    return false;
  }

  startServer().catch((err) => {
    logger.error(err, "Falha ao inicializar servidor");
    exit(1);
  });

  return true;
}
