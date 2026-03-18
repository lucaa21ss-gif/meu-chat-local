import { runAsMainModule } from "./src/http/app-main-module.js";
import { startConfiguredServer } from "./src/http/app-startup.js";
import { createIntegrityRuntimeService } from "./src/modules/resilience/integrity-service.js";

export { createIntegrityRuntimeService };
export { createConfiguredApp as createApp } from "./src/http/app-create.js";

export async function startServer(port = 3001) {
  return startConfiguredServer({ port });
}

runAsMainModule({
  metaUrl: import.meta.url,
  startServer,
});
