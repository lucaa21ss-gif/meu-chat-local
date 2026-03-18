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
import { createStore, initStoreDb } from "./src/http/app-store.js";
import { APP_ROUTE_REGISTRARS } from "./src/http/app-route-registrars.js";
import { scheduleBackupJob } from "./src/http/app-backup-scheduler.js";
import { createAppContext } from "./src/http/app-context.js";
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
    backupService,
    storageService,
    capacityService,
    queueService,
    baselineService,
    approvalService,
    roleLimiter,
    routeDeps,
  } = createAppContext({
    deps,
    store,
    serverDir,
    chatClient,
    logger,
    HttpError,
    asyncHandler,
    parseOriginList,
    parsePositiveInt,
    DEFAULT_RETRY_DELAYS_MS,
    buildCorsOriginValidator,
    telemetry: {
      isTelemetryEnabled,
      setTelemetryEnabled,
      resetTelemetryStats,
      getTelemetryStats,
    },
    constants: {
      CONFIG_KEYS,
      HEALTH_STATUS,
      INCIDENT_RUNBOOK_TYPES,
    },
    normalizeRole,
    hasRequiredRole,
    parseUserId,
    parseOperationalApprovalId,
    requestWindowMsFallback: Number.parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`,
      10,
    ),
    buildOverallHealthStatus,
    buildSloSnapshot,
    buildTriageRecommendations,
    registrars: APP_ROUTE_REGISTRARS,
    parsers: {
      parseSystemPrompt,
      parseTheme,
      parseStorageLimitMb,
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
      parseUiPreferences,
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
      getChatId,
      getMessageImages,
      buildRagSystemMessage,
      buildSystemMessages,
      executeWithModelRecovery,
      clamp,
      areConfigValuesEqual,
    },
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

  scheduleBackupJob({ app, intervalMinutes, logger });

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
