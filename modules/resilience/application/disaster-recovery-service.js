import path from "node:path";
import { mkdir as fsMkdir, writeFile as fsWriteFile } from "node:fs/promises";
import { HEALTH_STATUS } from "../../../shared/config/app-constants.js";
import { sleep } from "../../../shared/kernel/model-recovery.js";
import { buildOverallHealthStatus } from "../../health/application/health-builders.js";

export function createDefaultDisasterRecoveryService({
  store,
  backupService,
  healthProviders,
  artifactsDir,
} = {}) {
  async function writeReport(report) {
    const scenarioId = report?.scenarioId || `dr-${Date.now()}`;
    await fsMkdir(artifactsDir, { recursive: true });
    const filePath = path.join(artifactsDir, `${scenarioId}.json`);
    await fsWriteFile(filePath, JSON.stringify(report, null, 2), "utf8");
    return filePath;
  }

  async function runScenario({ actorUserId = null, passphrase = null, scenarioId = null } = {}) {
    const effectiveScenarioId = scenarioId || `dr-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const sentinelChatId = `dr-sentinel-${Date.now()}`;
    const sentinelMessage = "DR sentinel message";
    const steps = [];

    try {
      await store.createChat(sentinelChatId, "DR Sentinel", "user-default");
      await store.appendMessage(sentinelChatId, "user", sentinelMessage);
      steps.push({
        name: "seed-state",
        status: "completed",
        at: new Date().toISOString(),
      });

      const backup = await backupService.createBackup({ passphrase });
      steps.push({
        name: "backup-export",
        status: "completed",
        at: new Date().toISOString(),
        details: {
          fileName: backup.fileName,
          encrypted: !!backup.isEncrypted,
          sizeBytes: backup.sizeBytes,
        },
      });

      await store.deleteChat(sentinelChatId);
      steps.push({
        name: "simulate-disaster",
        status: "completed",
        at: new Date().toISOString(),
      });

      const restoreStartedAt = Date.now();
      await backupService.restoreBackup(backup.archiveBuffer, { passphrase });

      let restored = false;
      for (let index = 0; index < 20; index += 1) {
        const chats = await store.listChats("user-default", {
          favoriteOnly: false,
          showArchived: false,
          tag: null,
        });
        if (Array.isArray(chats) && chats.some((item) => item.id === sentinelChatId)) {
          restored = true;
          break;
        }
        await sleep(150);
      }

      const [db, model, disk] = await Promise.all([
        healthProviders.checkDb(),
        healthProviders.checkModel(),
        healthProviders.checkDisk(),
      ]);

      const healthStatus = buildOverallHealthStatus({ db, model, disk });
      const rtoMs = Date.now() - restoreStartedAt;
      const status =
        restored && healthStatus !== HEALTH_STATUS.UNHEALTHY ? "passed" : "failed";

      steps.push({
        name: "restore-and-validate",
        status: status === "passed" ? "completed" : "failed",
        at: new Date().toISOString(),
        details: {
          restored,
          healthStatus,
          rtoMs,
        },
      });

      const report = {
        scenarioId: effectiveScenarioId,
        status,
        startedAt,
        finishedAt: new Date().toISOString(),
        actorUserId,
        indicators: {
          rtoMs,
          healthStatus,
          restored,
        },
        checks: {
          health: { db, model, disk },
          sentinelChatId,
        },
        steps,
      };

      const reportPath = await writeReport(report);
      return {
        ok: status === "passed",
        report,
        reportPath,
      };
    } catch (error) {
      const report = {
        scenarioId: effectiveScenarioId,
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        actorUserId,
        indicators: {
          rtoMs: null,
          healthStatus: null,
          restored: false,
        },
        checks: {
          sentinelChatId,
        },
        steps,
        error: String(error?.message || error),
      };
      const reportPath = await writeReport(report);
      return {
        ok: false,
        report,
        reportPath,
      };
    }
  }

  return {
    runScenario,
  };
}