import path from "node:path";
import { createStorageService } from "../infra/fs/storage-service.js";
import { resolveDbPath } from "./app-store.js";
import { createDefaultIncidentService } from "../modules/incident/incident-service.js";
import { createDefaultBackupService } from "../modules/backup/backup-service.js";
import { createDefaultAutoHealingService } from "../modules/resilience/auto-healing-service.js";
import { createDefaultOperationalApprovalService } from "../modules/approvals/approval-service.js";
import {
  buildBaselineConfigSnapshot,
  createDefaultBaselineService,
} from "../modules/config-governance/baseline-service.js";
import { createCapacityProfileService } from "../modules/governance/capacity-service.js";
import { createConfigRollbackService } from "../modules/config-governance/config-rollback-service.js";
import { createDefaultDisasterRecoveryService } from "../modules/resilience/disaster-recovery-service.js";
import { createIntegrityRuntimeService } from "../modules/resilience/integrity-service.js";
import { createDefaultHealthProviders } from "../modules/health/health-providers.js";
import { createQueueService } from "../modules/governance/queue-service.js";
import { createScorecardService } from "../modules/governance/scorecard-service.js";

export function createAppServices({
  deps,
  store,
  serverDir,
  chatClient,
  ollama,
  parsers,
  telemetry,
  constants,
}) {
  const { ollamaFallbackModel, ollamaMaxAttempts, ollamaTimeoutMs, ollamaRetryDelays } =
    ollama;
  const {
    parsePositiveInt,
    parseSystemPrompt,
    parseTheme,
    parseStorageLimitMb,
    parseBooleanLike,
  } = parsers;
  const { isTelemetryEnabled, setTelemetryEnabled, resetTelemetryStats } = telemetry;
  const { CONFIG_KEYS } = constants;

  const backupService =
    deps.backupService ||
    createDefaultBackupService({
      dbPath: resolveDbPath(deps),
      backupRoot:
        deps.backupRoot ||
        process.env.BACKUP_DIR ||
        path.join(serverDir, "backups"),
      includeDirs:
        deps.backupIncludeDirs || process.env.BACKUP_INCLUDE_DIRS || "uploads,documents",
      backupKeep: deps.backupKeep || process.env.BACKUP_KEEP,
    });

  const storageService =
    deps.storageService ||
    createStorageService({
      baseDir: deps.storageBaseDir || serverDir,
      dbPath: resolveDbPath(deps),
    });

  const incidentService =
    deps.incidentService || createDefaultIncidentService(deps.incidentState);
  const dbPath = resolveDbPath(deps);

  const healthProviders =
    deps.healthProviders ||
    createDefaultHealthProviders({
      store,
      chatClient,
      dbPath,
    });

  const autoHealingService =
    deps.autoHealingService ||
    createDefaultAutoHealingService({
      healthProviders,
      store,
      chatClient,
      ollamaFallbackModel,
      ollamaMaxAttempts,
      ollamaTimeoutMs,
      ollamaRetryDelays,
      state: deps.autoHealingState,
    });

  const disasterRecoveryService =
    deps.disasterRecoveryService ||
    createDefaultDisasterRecoveryService({
      store,
      backupService,
      healthProviders,
      artifactsDir: path.join(serverDir, "artifacts", "dr"),
    });

  const integrityService =
    deps.integrityService ||
    createIntegrityRuntimeService({
      baseDir: path.resolve(serverDir, ".."),
      manifestPath: path.resolve(serverDir, "..", ".integrity-manifest.sha256"),
      targets: [
        "docker-compose.yml",
        "server/package.json",
        "server/package-lock.json",
        "web/package.json",
        "web/package-lock.json",
        "scripts/install.sh",
        "scripts/start.sh",
        "scripts/stop.sh",
        "scripts/uninstall.sh",
      ],
      staleAfterMs: 30_000,
    });

  const capacityService =
    deps.capacityService ||
    createCapacityProfileService({
      baseDir: path.resolve(serverDir, ".."),
      artifactsDir: path.join(serverDir, "artifacts", "capacity"),
    });

  const queueService =
    deps.queueService ||
    createQueueService({
      maxConcurrency: parsePositiveInt(
        process.env.QUEUE_MAX_CONCURRENCY,
        4,
        1,
        32,
      ),
      maxQueueSize: parsePositiveInt(
        process.env.QUEUE_MAX_SIZE,
        100,
        1,
        500,
      ),
      taskTimeoutMs: parsePositiveInt(
        process.env.QUEUE_TASK_TIMEOUT_MS,
        30000,
        5000,
        120000,
      ),
      rejectPolicy: (process.env.QUEUE_REJECT_POLICY || "reject").trim(),
    });

  const baselineService =
    deps.baselineService ||
    createDefaultBaselineService({
      baselinePath: path.join(serverDir, "artifacts", "baseline", "config-baseline.json"),
      getConfig: () =>
        buildBaselineConfigSnapshot({
          isTelemetryEnabled,
          parsePositiveInt,
          queueConfig: {
            maxConcurrency: process.env.QUEUE_MAX_CONCURRENCY,
            maxSize: process.env.QUEUE_MAX_SIZE,
            taskTimeoutMs: process.env.QUEUE_TASK_TIMEOUT_MS,
            rejectPolicy: process.env.QUEUE_REJECT_POLICY || "reject",
          },
          autoHealingService,
        }),
    });

  const approvalService =
    deps.approvalService ||
    createDefaultOperationalApprovalService({
      approvalsPath: path.join(
        serverDir,
        "artifacts",
        "approvals",
        "operational-approvals.json",
      ),
    });

  const configRollbackService =
    deps.configRollbackService ||
    createConfigRollbackService({
      store,
      configKeys: CONFIG_KEYS,
      parseSystemPrompt,
      parseTheme,
      parseStorageLimitMb,
      parseBooleanLike,
      isTelemetryEnabled,
      setTelemetryEnabled,
      resetTelemetryStats,
    });

  const scorecardService =
    deps.scorecardService ||
    createScorecardService({
      scorecardPath: path.join(serverDir, "artifacts", "scorecard", "scorecard-latest.json"),
    });

  return {
    backupService,
    storageService,
    incidentService,
    healthProviders,
    autoHealingService,
    disasterRecoveryService,
    integrityService,
    capacityService,
    queueService,
    baselineService,
    approvalService,
    configRollbackService,
    scorecardService,
  };
}
