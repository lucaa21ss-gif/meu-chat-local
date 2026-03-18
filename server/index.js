import logger from "./logger.js";
import { createConfiguredApp } from "./src/http/app-factory.js";
import { runAsMainModule } from "./src/http/app-main-module.js";
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
  });
}

runAsMainModule({
  metaUrl: import.meta.url,
  startServer,
  logger,
});
