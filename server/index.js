import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { client } from "./ollama.js";
import { createRoleLimiterQueue } from "./rateLimiter.js";
import logger, { createHttpLogger } from "./logger.js";
import {
  initDb,
  getDbPath,
  listChats,
  createChat,
  duplicateChat,
  renameChat,
  deleteChat,
  setChatFavorite,
  setChatArchived,
  setChatTags,
  setChatSystemPrompt,
  getChatSystemPrompts,
  ensureChat,
  getMessages,
  searchMessages,
  appendAuditLog,
  appendConfigVersion,
  listAuditLogs,
  listConfigVersions,
  getConfigVersionById,
  exportAuditLogs,
  appendMessage,
  resetChat,
  exportChatMarkdown,
  exportChatJson,
  importChatJson,
  renameChatFromFirstMessage,
  upsertRagDocument,
  listRagDocuments,
  searchDocumentChunks,
  listUsers,
  createUser,
  renameUser,
  setUserTheme,
  setUserStorageLimit,
  setUserRole,
  setUserDefaultSystemPrompt,
  deleteUser,
  getUserById,
  ensureUser,
} from "./db.js";
import { getUiPreferences, setUiPreferences } from "./db.js";
import { createStorageService } from "./storage.js";
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
import { createDefaultIncidentService } from "./src/modules/governance/incident-service.js";
import { createDefaultBackupService } from "./src/modules/governance/backup-service.js";
import { createDefaultAutoHealingService } from "./src/modules/governance/auto-healing-service.js";
import { createDefaultOperationalApprovalService } from "./src/modules/governance/approval-service.js";
import {
  buildBaselineConfigSnapshot,
  createDefaultBaselineService,
} from "./src/modules/governance/baseline-service.js";
import { createCapacityProfileService } from "./src/modules/governance/capacity-service.js";
import { createConfigRollbackService } from "./src/modules/governance/config-rollback-service.js";
import { createDefaultDisasterRecoveryService } from "./src/modules/governance/disaster-recovery-service.js";
import { createIntegrityRuntimeService } from "./src/modules/governance/integrity-service.js";
import { createIncidentRunbookSignalsCollector } from "./src/modules/governance/incident-runbook-signals.js";
import {
  buildOverallHealthStatus,
  buildSloSnapshot,
  buildTriageRecommendations,
} from "./src/modules/health/health-builders.js";
import { createDefaultHealthProviders } from "./src/modules/health/health-providers.js";
import { createQueueService } from "./src/modules/governance/queue-service.js";
import { createScorecardService } from "./src/modules/governance/scorecard-service.js";
import { registerChatRoutes } from "./src/modules/chat/register-chat-routes.js";
import { registerChatsRoutes } from "./src/modules/chat/register-chats-routes.js";
import { registerRagRoutes } from "./src/modules/chat/register-rag-routes.js";
import { registerBackupRoutes } from "./src/modules/governance/register-backup-routes.js";
import { registerHealthRoutes } from "./src/modules/health/register-health-routes.js";

export { createIntegrityRuntimeService };

export function createApp(deps = {}) {
  const chatClient = deps.chatClient || client;
  const store = {
    initDb: deps.initDb || initDb,
    listChats: deps.listChats || listChats,
    createChat: deps.createChat || createChat,
    duplicateChat: deps.duplicateChat || duplicateChat,
    renameChat: deps.renameChat || renameChat,
    deleteChat: deps.deleteChat || deleteChat,
    setChatFavorite: deps.setChatFavorite || setChatFavorite,
    setChatArchived: deps.setChatArchived || setChatArchived,
    setChatTags: deps.setChatTags || setChatTags,
    setChatSystemPrompt: deps.setChatSystemPrompt || setChatSystemPrompt,
    getChatSystemPrompts: deps.getChatSystemPrompts || getChatSystemPrompts,
    ensureChat: deps.ensureChat || ensureChat,
    getMessages: deps.getMessages || getMessages,
    searchMessages: deps.searchMessages || searchMessages,
    appendAuditLog: deps.appendAuditLog || appendAuditLog,
    appendConfigVersion: deps.appendConfigVersion || appendConfigVersion,
    listAuditLogs: deps.listAuditLogs || listAuditLogs,
    listConfigVersions: deps.listConfigVersions || listConfigVersions,
    getConfigVersionById: deps.getConfigVersionById || getConfigVersionById,
    exportAuditLogs: deps.exportAuditLogs || exportAuditLogs,
    upsertRagDocument: deps.upsertRagDocument || upsertRagDocument,
    listRagDocuments: deps.listRagDocuments || listRagDocuments,
    searchDocumentChunks: deps.searchDocumentChunks || searchDocumentChunks,
    listUsers: deps.listUsers || listUsers,
    createUser: deps.createUser || createUser,
    renameUser: deps.renameUser || renameUser,
    setUserTheme: deps.setUserTheme || setUserTheme,
    setUserStorageLimit: deps.setUserStorageLimit || setUserStorageLimit,
    setUserRole: deps.setUserRole || setUserRole,
    setUserDefaultSystemPrompt:
      deps.setUserDefaultSystemPrompt || setUserDefaultSystemPrompt,
    deleteUser: deps.deleteUser || deleteUser,
    getUserById: deps.getUserById || getUserById,
    ensureUser: deps.ensureUser || ensureUser,
    getUiPreferences: deps.getUiPreferences || getUiPreferences,
    setUiPreferences: deps.setUiPreferences || setUiPreferences,
    appendMessage: deps.appendMessage || appendMessage,
    resetChat: deps.resetChat || resetChat,
    exportChatMarkdown: deps.exportChatMarkdown || exportChatMarkdown,
    exportChatJson: deps.exportChatJson || exportChatJson,
    importChatJson: deps.importChatJson || importChatJson,
    renameChatFromFirstMessage:
      deps.renameChatFromFirstMessage || renameChatFromFirstMessage,
  };

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
  const backupService =
    deps.backupService ||
    createDefaultBackupService({
      dbPath: deps.dbPath || getDbPath(),
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
      dbPath: deps.dbPath || getDbPath(),
    });
  const incidentService =
    deps.incidentService || createDefaultIncidentService(deps.incidentState);
  const dbPath = deps.dbPath || getDbPath();
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

  const roleLimits = deps.roleLimits ?? {
    admin: { windowMs: requestWindowMs, max: 300, chatMax: 100 },
    operator: { windowMs: requestWindowMs, max: 150, chatMax: 50 },
    viewer: { windowMs: requestWindowMs, max: 60, chatMax: 20 },
  };
  const roleLimiter = deps.roleLimiter ?? createRoleLimiterQueue({
    roleLimits,
    queueMax: Number.parseInt(process.env.RATE_LIMIT_QUEUE_MAX || "30", 10),
    queueTimeoutMs: Number.parseInt(
      process.env.RATE_LIMIT_QUEUE_TIMEOUT_MS || "8000",
      10,
    ),
    getRoleForUser: async (userId) => {
      try {
        const user = await store.getUserById(userId);
        return normalizeRole(user?.role, "viewer");
      } catch {
        return "viewer";
      }
    },
  });
  const collectIncidentRunbookSignals =
    deps.collectIncidentRunbookSignals ||
    createIncidentRunbookSignalsCollector({
      healthProviders,
      store,
      getTelemetryStats,
      backupService,
      roleLimiter,
      incidentService,
      buildOverallHealthStatus,
      buildSloSnapshot,
      buildTriageRecommendations,
    });

  async function recordAudit(eventType, userId = null, meta = {}) {
    try {
      await store.appendAuditLog(userId, eventType, meta);
    } catch (error) {
      logger.warn(
        {
          eventType,
          userId,
          error: error.message,
        },
        "Falha ao registrar evento de auditoria",
      );
    }
  }

  async function recordConfigVersion(payload = {}) {
    try {
      await store.appendConfigVersion(payload);
    } catch (error) {
      logger.warn(
        {
          configKey: payload.configKey,
          targetType: payload.targetType,
          targetId: payload.targetId,
          error: error.message,
        },
        "Falha ao registrar versao de configuracao",
      );
    }
  }

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

  registerAppRoutes(app, {
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
    healthRoutes: {
      asyncHandler,
      requireMinimumRole,
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
    },
    chatRoutes: {
      asyncHandler,
      assertBodyObject,
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
      queueService,
      store,
      HttpError,
    },
    ragRoutes: {
      asyncHandler,
      assertBodyObject,
      parseChatId,
      parseRagDocuments,
      parseSearchQuery,
      recordBlockedAttempt,
      clamp,
      store,
    },
    userRoutes: {
      asyncHandler,
      requireMinimumRole,
      requireAdminOrSelf,
      assertBodyObject,
      parseUserId,
      parseUserName,
      parseUserRole,
      parseChatId,
      parseSystemPrompt,
      parseTheme,
      parseUiPreferences,
      parseStorageLimitMb,
      resolveActor,
      recordAudit,
      recordConfigVersion,
      CONFIG_KEYS,
      HttpError,
      store,
    },
    chatsRoutes: {
      asyncHandler,
      assertBodyObject,
      parseChatId,
      parseTitle,
      parseUserId,
      parseChatListFilters,
      parseBooleanLike,
      parseTags,
      parseSystemPrompt,
      parseSearchQuery,
      parseSearchPage,
      parseSearchLimit,
      parseSearchRole,
      parseSearchDate,
      parseChatImportPayload,
      parseUserOnly,
      recordBlockedAttempt,
      resolveActor,
      recordAudit,
      recordConfigVersion,
      requireMinimumRole,
      CONFIG_KEYS,
      store,
      HttpError,
    },
    backupRoutes: {
      asyncHandler,
      requireMinimumRole,
      assertBodyObject,
      resolveActor,
      requireOperationalApproval,
      parseBackupPassphrase,
      parseBackupPayload,
      parsePositiveInt,
      recordAudit,
      backupService,
      HttpError,
    },
    incidentRoutes: {
      asyncHandler,
      requireMinimumRole,
      assertBodyObject,
      resolveActor,
      recordAudit,
      requireOperationalApproval,
      parseIncidentUpdatePayload,
      parseIncidentRunbookType,
      parseIncidentRunbookMode,
      parseIncidentOwner,
      parseIncidentSummary,
      parseIncidentNextUpdateAt,
      parseBackupPassphrase,
      collectIncidentRunbookSignals,
      incidentService,
      INCIDENT_RUNBOOK_TYPES,
    },
    resilienceRoutes: {
      asyncHandler,
      requireMinimumRole,
      assertBodyObject,
      resolveActor,
      recordAudit,
      requireOperationalApproval,
      parseAutoHealingConfigPatch,
      parseAutoHealingPolicy,
      parseDisasterScenarioId,
      parseBackupPassphrase,
      parseBooleanLike,
      autoHealingService,
      disasterRecoveryService,
      integrityService,
    },
    storageRoutes: {
      asyncHandler,
      requireMinimumRole,
      assertBodyObject,
      parseUserId,
      parseCleanupMode,
      parseCleanupTarget,
      parseCleanupOlderThanDays,
      parseCleanupMaxDeleteMb,
      parseCleanupPreserveValidatedBackups,
      parseBackupPassphrase,
      resolveActor,
      requireOperationalApproval,
      storageService,
      store,
    },
    configRoutes: {
      asyncHandler,
      requireMinimumRole,
      resolveActor,
      recordAudit,
      recordConfigVersion,
      parseConfigVersionFilters,
      parseConfigVersionId,
      areConfigValuesEqual,
      readCurrentConfigValue,
      applyConfigValue,
      baselineService,
      store,
      HttpError,
    },
    approvalRoutes: {
      asyncHandler,
      requireMinimumRole,
      assertBodyObject,
      resolveActor,
      recordAudit,
      parseOperationalApprovalStatus,
      parsePositiveInt,
      parseOperationalApprovalAction,
      parseOperationalApprovalReason,
      parseOperationalApprovalWindowMinutes,
      parseOperationalApprovalId,
      parseOperationalApprovalDecision,
      approvalService,
    },
    auditRoutes: {
      asyncHandler,
      requireMinimumRole,
      parseAuditFilters,
      store,
    },
    observabilityRoutes: {
      asyncHandler,
      requireMinimumRole,
      recordAudit,
      buildOverallHealthStatus,
      buildSloSnapshot,
      buildTriageRecommendations,
      getTelemetryStats,
      isTelemetryEnabled,
      healthProviders,
      backupService,
      integrityService,
      capacityService,
      baselineService,
      autoHealingService,
      incidentService,
      queueService,
      scorecardService,
      approvalService,
      storageService,
      roleLimiter,
      store,
    },
  });

  return app;
}

export async function startServer(port = 3001) {
  await initDb();
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
