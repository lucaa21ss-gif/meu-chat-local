import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { client } from "./ollama.js";
import logger, { createHttpLogger } from "./logger.js";
import {
  isEnabled as isTelemetryEnabled,
  setEnabled as setTelemetryEnabled,
  getStats as getTelemetryStats,
  resetStats as resetTelemetryStats,
  createTelemetryMiddleware,
} from "./telemetry.js";
import { HttpError } from "./src/shared/errors/HttpError.js";
import {
  DEFAULT_RETRY_DELAYS_MS,
  executeWithModelRecovery,
} from "./src/shared/model-recovery.js";
import {
  CONFIG_KEYS,
  HEALTH_STATUS,
  INCIDENT_RUNBOOK_TYPES,
} from "./src/shared/app-constants.js";
import {
  areConfigValuesEqual,
  assertBodyObject,
  buildRagSystemMessage,
  buildSystemMessages,
  clamp,
  getChatId,
  getMessageImages,
  hasRequiredRole,
  normalizeRole,
  parseAuditFilters,
  parseAutoHealingConfigPatch,
  parseAutoHealingPolicy,
  parseBackupPassphrase,
  parseBackupPayload,
  parseBooleanLike,
  parseChatId,
  parseChatImportPayload,
  parseChatListFilters,
  parseCleanupMaxDeleteMb,
  parseCleanupMode,
  parseCleanupOlderThanDays,
  parseCleanupPreserveValidatedBackups,
  parseCleanupTarget,
  parseConfigVersionFilters,
  parseConfigVersionId,
  parseDisasterScenarioId,
  parseIncidentNextUpdateAt,
  parseIncidentOwner,
  parseIncidentRunbookMode,
  parseIncidentRunbookType,
  parseIncidentSummary,
  parseIncidentUpdatePayload,
  parseMessage,
  parseOperationalApprovalAction,
  parseOperationalApprovalDecision,
  parseOperationalApprovalId,
  parseOperationalApprovalReason,
  parseOperationalApprovalStatus,
  parseOperationalApprovalWindowMinutes,
  parseOptions,
  parseOriginList,
  parsePositiveInt,
  parseRagDocuments,
  parseRagOptions,
  parseSearchDate,
  parseSearchLimit,
  parseSearchPage,
  parseSearchQuery,
  parseSearchRole,
  parseStorageLimitMb,
  parseSystemPrompt,
  parseTags,
  parseTheme,
  parseTitle,
  parseUiPreferences,
  parseUserId,
  parseUserName,
  parseUserOnly,
  parseUserRole,
} from "./src/shared/parsers.js";
import { asyncHandler } from "./src/http/async-handler.js";
import { createRouteDepsForApp } from "./src/http/app-route-wiring.js";
import { createStore, initStoreDb } from "./src/http/app-store.js";
import { createAppServices } from "./src/http/app-services.js";
import { createGovernanceRuntime } from "./src/http/app-governance-runtime.js";
import { createAppRuntimeConfig } from "./src/http/app-runtime-config.js";
import { createAppGuardsAndAudit } from "./src/http/app-guards-and-audit.js";
import { APP_ROUTE_REGISTRARS } from "./src/http/app-route-registrars.js";
import {
  attachAppLocals,
  buildCorsOriginValidator,
  configureAppBootstrap,
} from "./src/http/app-bootstrap.js";
import { registerAppRoutes } from "./src/http/register-app-routes.js";
import { createIntegrityRuntimeService } from "./src/modules/governance/integrity-service.js";
import {
  buildOverallHealthStatus,
  buildSloSnapshot,
  buildTriageRecommendations,
} from "./src/modules/health/health-builders.js";

export { createIntegrityRuntimeService };

export function createApp(deps = {}) {
  const chatClient = deps.chatClient || client;
  const store = createStore(deps);

  const app = express();
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  const {
    webDir,
    corsOrigin,
    requestWindowMs,
    ollamaTimeoutMs,
    ollamaMaxAttempts,
    ollamaFallbackModel,
    ollamaRetryDelays,
  } = createAppRuntimeConfig({
    deps,
    serverDir,
    parseOriginList,
    HttpError,
    parsePositiveInt,
    DEFAULT_RETRY_DELAYS_MS,
    buildCorsOriginValidator,
  });
  const {
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
  } = createAppServices({
    deps,
    store,
    serverDir,
    chatClient,
    ollama: {
      ollamaFallbackModel,
      ollamaMaxAttempts,
      ollamaTimeoutMs,
      ollamaRetryDelays,
    },
    parsers: {
      parsePositiveInt,
      parseSystemPrompt,
      parseTheme,
      parseStorageLimitMb,
      parseBooleanLike,
    },
    telemetry: {
      isTelemetryEnabled,
      setTelemetryEnabled,
      resetTelemetryStats,
    },
    constants: {
      CONFIG_KEYS,
    },
  });

  const { roleLimiter, collectIncidentRunbookSignals } =
    createGovernanceRuntime({
      deps,
      requestWindowMs,
      store,
      normalizeRole,
      parsePositiveInt,
      getTelemetryStats,
      backupService,
      incidentService,
      healthProviders,
      buildOverallHealthStatus,
      buildSloSnapshot,
      buildTriageRecommendations,
    });

  const {
    recordAudit,
    recordConfigVersion,
    readCurrentConfigValue,
    applyConfigValue,
    resolveActor,
    requireMinimumRole,
    requireAdminOrSelf,
    recordBlockedAttempt,
    requireOperationalApproval,
  } = createAppGuardsAndAudit({
    store,
    logger,
    configRollbackService,
    approvalService,
    parseUserId,
    normalizeRole,
    hasRequiredRole,
    asyncHandler,
    HttpError,
    parseOperationalApprovalId,
  });

  configureAppBootstrap(app, {
    corsOrigin,
    webDir,
    roleLimiter,
    createHttpLogger,
    logger,
    createTelemetryMiddleware,
    express,
  });

  attachAppLocals(app, {
    backupService,
    storageService,
    capacityService,
    queueService,
    baselineService,
    approvalService,
  });

  const routeDeps = createRouteDepsForApp({
    core: {
      webDir,
      logger,
      HttpError,
      asyncHandler,
      HEALTH_STATUS,
      CONFIG_KEYS,
      INCIDENT_RUNBOOK_TYPES,
      store,
      chatClient,
    },
    registrars: APP_ROUTE_REGISTRARS,
    guards: {
      requireMinimumRole,
      requireAdminOrSelf,
      resolveActor,
      recordBlockedAttempt,
      requireOperationalApproval,
    },
    runtime: {
      getTelemetryStats,
      isTelemetryEnabled,
      setTelemetryEnabled,
      resetTelemetryStats,
      roleLimiter,
      ollamaFallbackModel,
      ollamaMaxAttempts,
      ollamaTimeoutMs,
      ollamaRetryDelays,
    },
    services: {
      healthProviders,
      integrityService,
      autoHealingService,
      capacityService,
      queueService,
      baselineService,
      backupService,
      collectIncidentRunbookSignals,
      incidentService,
      disasterRecoveryService,
      storageService,
      readCurrentConfigValue,
      applyConfigValue,
      approvalService,
      scorecardService,
    },
    parsers: {
      parseBooleanLike,
      parseMessage,
      parseOptions,
      parseRagOptions,
      parseChatId,
      parseRagDocuments,
      parseSearchQuery,
      parseUserId,
      parseUserName,
      parseUserRole,
      parseSystemPrompt,
      parseTheme,
      parseUiPreferences,
      parseStorageLimitMb,
      parseTitle,
      parseChatListFilters,
      parseTags,
      parseSearchPage,
      parseSearchLimit,
      parseSearchRole,
      parseSearchDate,
      parseChatImportPayload,
      parseUserOnly,
      parseBackupPassphrase,
      parseBackupPayload,
      parsePositiveInt,
      parseIncidentUpdatePayload,
      parseIncidentRunbookType,
      parseIncidentRunbookMode,
      parseIncidentOwner,
      parseIncidentSummary,
      parseIncidentNextUpdateAt,
      parseAutoHealingConfigPatch,
      parseAutoHealingPolicy,
      parseDisasterScenarioId,
      parseCleanupMode,
      parseCleanupTarget,
      parseCleanupOlderThanDays,
      parseCleanupMaxDeleteMb,
      parseCleanupPreserveValidatedBackups,
      parseConfigVersionFilters,
      parseConfigVersionId,
      parseOperationalApprovalStatus,
      parseOperationalApprovalAction,
      parseOperationalApprovalReason,
      parseOperationalApprovalWindowMinutes,
      parseOperationalApprovalId,
      parseOperationalApprovalDecision,
      parseAuditFilters,
    },
    features: {
      assertBodyObject,
      recordAudit,
      recordConfigVersion,
      buildOverallHealthStatus,
      buildSloSnapshot,
      getChatId,
      getMessageImages,
      buildRagSystemMessage,
      buildSystemMessages,
      executeWithModelRecovery,
      clamp,
      areConfigValuesEqual,
      buildTriageRecommendations,
    },
  });

  registerAppRoutes(app, routeDeps);

  return app;
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

  if (intervalMinutes > 0 && app?.locals?.backupService?.createBackup) {
    const intervalMs = intervalMinutes * 60 * 1000;
    const timer = setInterval(async () => {
      try {
        const backup = await app.locals.backupService.createBackup();
        logger.info(
          { fileName: backup.fileName, sizeBytes: backup.sizeBytes },
          "Backup agendado concluido",
        );
      } catch (error) {
        logger.error({ error: error.message }, "Falha no backup agendado");
      }
    }, intervalMs);
    timer.unref();
    logger.info(
      { intervalMinutes },
      "Backup agendado habilitado por BACKUP_INTERVAL_MINUTES",
    );
  }

  const server = app.listen(port, () => {
    logger.info(`API rodando em http://localhost:${port}`);
  });
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
