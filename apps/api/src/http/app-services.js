import path from "node:path";
import { createStorageService } from "../../../../platform/fs/storage/storage-service.js";
import {
  createAppServicePaths,
  createBaselineQueueConfig,
  createIntegrityServiceConfig,
  createQueueServiceConfig,
} from "./app-services-wiring.js";
import { createDefaultIncidentService } from "../../../../modules/incident/application/incident-service.js";
import { createDefaultBackupService } from "../../../../modules/backup/application/backup-service.js";
import { createDefaultAutoHealingService } from "../../../../modules/resilience/application/auto-healing-service.js";
import { createDefaultOperationalApprovalService } from "../../../../modules/approvals/application/approval-service.js";
import {
  buildBaselineConfigSnapshot,
  createDefaultBaselineService,
} from "../../../../modules/config-governance/application/baseline-service.js";
import { createCapacityProfileService } from "../../../../modules/capacity/application/capacity-service.js";
import { createConfigRollbackService } from "../../../../modules/config-governance/application/config-rollback-service.js";
import { createDefaultDisasterRecoveryService } from "../../../../modules/resilience/application/disaster-recovery-service.js";
import { createIntegrityRuntimeService } from "../../../../modules/resilience/application/integrity-service.js";
import { createDefaultHealthProviders } from "../../../../modules/health/application/health-providers.js";
import { createQueueService } from "../../../../modules/capacity/application/queue-service.js";
import { createScorecardService } from "../../../../modules/capacity/application/scorecard-service.js";

export function createAppServices({
  deps,
  store,
  serverDir,
  chatClient,
  ollamaFallbackModel,
  ollamaMaxAttempts,
  ollamaTimeoutMs,
  ollamaRetryDelays,
  parsers,
  isTelemetryEnabled,
  setTelemetryEnabled,
  resetTelemetryStats,
  CONFIG_KEYS,
}) {
  const {
    parsePositiveInt,
    parseSystemPrompt,
    parseTheme,
    parseStorageLimitMb,
    parseBooleanLike,
  } = parsers;
  const { dbPath, repoRoot, artifactsDir } = createAppServicePaths({
    deps,
    serverDir,
  });

  const backupService =
    deps.backupService ||
    createDefaultBackupService({
      dbPath,
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
      dbPath,
    });

  const incidentService =
    deps.incidentService || createDefaultIncidentService(deps.incidentState);

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
      artifactsDir: path.join(artifactsDir, "dr"),
    });

  const integrityService =
    deps.integrityService ||
    createIntegrityRuntimeService(createIntegrityServiceConfig(repoRoot));

  const capacityService =
    deps.capacityService ||
    createCapacityProfileService({
      baseDir: repoRoot,
      artifactsDir: path.join(artifactsDir, "capacity"),
    });

  const queueService =
    deps.queueService ||
    createQueueService(createQueueServiceConfig({ parsePositiveInt }));

  const baselineService =
    deps.baselineService ||
    createDefaultBaselineService({
      baselinePath: path.join(artifactsDir, "baseline", "config-baseline.json"),
      getConfig: () =>
        buildBaselineConfigSnapshot({
          isTelemetryEnabled,
          parsePositiveInt,
          queueConfig: createBaselineQueueConfig(),
          autoHealingService,
        }),
    });

  const approvalService =
    deps.approvalService ||
    createDefaultOperationalApprovalService({
      approvalsPath: path.join(
        artifactsDir,
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
      scorecardPath: path.join(artifactsDir, "scorecard", "scorecard-latest.json"),
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
