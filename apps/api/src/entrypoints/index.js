import { runAsMainModule } from "./app-main-module.js";
import { startConfiguredServer } from "./app-startup.js";
import { createIntegrityRuntimeService } from "../../../../modules/resilience/application/integrity-service.js";

export { createIntegrityRuntimeService };
export { createConfiguredApp as createApp } from "../http/app-create.js";

export async function startServer(port = parseInt(process.env.PORT || "4000", 10)) {
  return startConfiguredServer({ port });
}

runAsMainModule({
  metaUrl: import.meta.url,
  startServer,
});
