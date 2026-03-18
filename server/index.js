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
import {
  buildRegisterAppRoutesDeps,
  createAuditHelpers,
} from "./src/http/app-route-deps.js";
import { createStore, initStoreDb } from "./src/http/app-store.js";
import { createAppServices } from "./src/http/app-services.js";
import { createGovernanceRuntime } from "./src/http/app-governance-runtime.js";
import {
  attachAppLocals,
  buildCorsOriginValidator,
  configureAppBootstrap,
} from "./src/http/app-bootstrap.js";
import { createAuthGuards } from "./src/http/auth-guards.js";
import { createOperationalGuards } from "./src/http/operational-guards.js";
import { registerAppRoutes } from "./src/http/register-app-routes.js";
import { registerUserRoutes } from "./src/modules/users/register-users-routes.js";
import { registerIncidentRoutes } from "./src/modules/governance/register-incident-routes.js";
import { registerApprovalRoutes } from "./src/modules/governance/register-approval-routes.js";
import { registerResilienceRoutes } from "./src/modules/governance/register-resilience-routes.js";
import { registerStorageRoutes } from "./src/modules/governance/register-storage-routes.js";
import { registerConfigRoutes } from "./src/modules/governance/register-config-routes.js";
import { registerAuditRoutes } from "./src/modules/governance/register-audit-routes.js";
import { registerObservabilityRoutes } from "./src/modules/governance/register-observability-routes.js";
import { createIntegrityRuntimeService } from "./src/modules/governance/integrity-service.js";
import {
  buildOverallHealthStatus,
  buildSloSnapshot,
  buildTriageRecommendations,
} from "./src/modules/health/health-builders.js";
import { registerChatRoutes } from "./src/modules/chat/register-chat-routes.js";
import { registerChatsRoutes } from "./src/modules/chat/register-chats-routes.js";
import { registerRagRoutes } from "./src/modules/chat/register-rag-routes.js";
import { registerBackupRoutes } from "./src/modules/governance/register-backup-routes.js";
import { registerHealthRoutes } from "./src/modules/health/register-health-routes.js";

export { createIntegrityRuntimeService };

export function createApp(deps = {}) {
  const chatClient = deps.chatClient || client;
  const store = createStore(deps);

  const app = express();
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  const webDir = deps.webDir || path.resolve(serverDir, "../web");
  const corsOrigin = buildCorsOriginValidator(
    deps.allowedOrigin ?? process.env.FRONTEND_ORIGIN,
    parseOriginList,
    HttpError,
  );
  const requestWindowMs = Number.parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`,
    10,
  );
  const ollamaTimeoutMs = parsePositiveInt(
    deps.ollamaTimeoutMs ?? process.env.OLLAMA_TIMEOUT_MS,
    45_000,
    1_000,
    120_000,
  );
  const ollamaMaxAttempts = parsePositiveInt(
    deps.ollamaMaxAttempts ?? process.env.OLLAMA_MAX_ATTEMPTS,
    2,
    1,
    3,
  );
  const ollamaFallbackModel = String(
    deps.ollamaFallbackModel ?? process.env.OLLAMA_FALLBACK_MODEL ?? "",
  ).trim();
  const ollamaRetryDelays = Array.isArray(deps.ollamaRetryDelays)
    ? deps.ollamaRetryDelays
    : DEFAULT_RETRY_DELAYS_MS;
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

  const { recordAudit, recordConfigVersion } = createAuditHelpers({
    store,
    logger,
  });

  const { readCurrentConfigValue, applyConfigValue } = configRollbackService;

  const { resolveActor, requireMinimumRole, requireAdminOrSelf } =
    createAuthGuards({
      store,
      parseUserId,
      normalizeRole,
      hasRequiredRole,
      asyncHandler,
      HttpError,
    });

  const { recordBlockedAttempt, requireOperationalApproval } =
    createOperationalGuards({
      resolveActor,
      recordAudit,
      approvalService,
      parseOperationalApprovalId,
      HttpError,
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

  const routeDeps = buildRegisterAppRoutesDeps({
    webDir,
    logger,
    HttpError,
    registerHealthRoutes,
    registerChatRoutes,
    registerRagRoutes,
    registerUserRoutes,
    registerChatsRoutes,
    registerBackupRoutes,
    registerIncidentRoutes,
    registerResilienceRoutes,
    registerStorageRoutes,
    registerConfigRoutes,
    registerApprovalRoutes,
    registerAuditRoutes,
    registerObservabilityRoutes,
    asyncHandler,
    requireMinimumRole,
    requireAdminOrSelf,
    assertBodyObject,
    parseBooleanLike,
    resolveActor,
    recordAudit,
    recordConfigVersion,
    buildOverallHealthStatus,
    buildSloSnapshot,
    getTelemetryStats,
    isTelemetryEnabled,
    setTelemetryEnabled,
    resetTelemetryStats,
    HEALTH_STATUS,
    healthProviders,
    integrityService,
    autoHealingService,
    capacityService,
    queueService,
    baselineService,
    roleLimiter,
    CONFIG_KEYS,
    store,
    parseMessage,
    getChatId,
    parseOptions,
    parseRagOptions,
    getMessageImages,
    recordBlockedAttempt,
    buildRagSystemMessage,
    buildSystemMessages,
    executeWithModelRecovery,
    ollamaFallbackModel,
    ollamaMaxAttempts,
    ollamaTimeoutMs,
    ollamaRetryDelays,
    chatClient,
    parseChatId,
    parseRagDocuments,
    parseSearchQuery,
    clamp,
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
    requireOperationalApproval,
    parseBackupPassphrase,
    parseBackupPayload,
    parsePositiveInt,
    backupService,
    parseIncidentUpdatePayload,
    parseIncidentRunbookType,
    parseIncidentRunbookMode,
    parseIncidentOwner,
    parseIncidentSummary,
    parseIncidentNextUpdateAt,
    collectIncidentRunbookSignals,
    incidentService,
    INCIDENT_RUNBOOK_TYPES,
    parseAutoHealingConfigPatch,
    parseAutoHealingPolicy,
    parseDisasterScenarioId,
    disasterRecoveryService,
    parseCleanupMode,
    parseCleanupTarget,
    parseCleanupOlderThanDays,
    parseCleanupMaxDeleteMb,
    parseCleanupPreserveValidatedBackups,
    storageService,
    parseConfigVersionFilters,
    parseConfigVersionId,
    areConfigValuesEqual,
    readCurrentConfigValue,
    applyConfigValue,
    parseOperationalApprovalStatus,
    parseOperationalApprovalAction,
    parseOperationalApprovalReason,
    parseOperationalApprovalWindowMinutes,
    parseOperationalApprovalId,
    parseOperationalApprovalDecision,
    approvalService,
    parseAuditFilters,
    buildTriageRecommendations,
    scorecardService,
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
