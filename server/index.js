import express from "express";
import cors from "cors";
import compression from "compression";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  readFile as fsReadFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import helmet from "helmet";
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
  parseIntegrityManifest,
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
import { createAuthGuards } from "./src/http/auth-guards.js";
import { createOperationalGuards } from "./src/http/operational-guards.js";
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

export function createIntegrityRuntimeService({
  baseDir,
  manifestPath,
  targets = [],
  staleAfterMs = 30_000,
} = {}) {
  const state = {
    lastCheckedAt: null,
    status: "unknown",
    mismatches: [],
    missingFiles: [],
    checkedFiles: [],
    reason: "integrity-check-not-run",
    staleAfterMs,
  };

  async function computeSha256(filePath) {
    const content = await fsReadFile(filePath);
    return createHash("sha256").update(content).digest("hex");
  }

  async function runCheck() {
    const now = new Date().toISOString();
    const resolvedTargets = [...new Set(targets.map((item) => String(item || "").trim()).filter(Boolean))];

    if (!manifestPath) {
      state.lastCheckedAt = now;
      state.status = "unknown";
      state.reason = "manifest-path-not-configured";
      state.checkedFiles = [];
      state.mismatches = [];
      state.missingFiles = [];
      return getStatus();
    }

    let manifestEntries = [];
    try {
      const manifestContent = await fsReadFile(manifestPath, "utf8");
      manifestEntries = parseIntegrityManifest(manifestContent);
    } catch {
      state.lastCheckedAt = now;
      state.status = "unknown";
      state.reason = "manifest-not-found";
      state.checkedFiles = [];
      state.mismatches = [];
      state.missingFiles = [];
      return getStatus();
    }

    const manifestMap = new Map(manifestEntries.map((entry) => [entry.file, entry.hash]));
    const filesToCheck = resolvedTargets.length ? resolvedTargets : Array.from(manifestMap.keys());

    const mismatches = [];
    const missingFiles = [];
    const checkedFiles = [];

    for (const relativePath of filesToCheck) {
      const expectedHash = manifestMap.get(relativePath) || null;
      if (!expectedHash) {
        mismatches.push({
          file: relativePath,
          reason: "missing-from-manifest",
        });
        continue;
      }

      const fullPath = path.join(baseDir, relativePath);
      try {
        const actualHash = await computeSha256(fullPath);
        checkedFiles.push(relativePath);
        if (actualHash !== expectedHash) {
          mismatches.push({
            file: relativePath,
            reason: "hash-mismatch",
          });
        }
      } catch {
        missingFiles.push(relativePath);
      }
    }

    state.lastCheckedAt = now;
    state.checkedFiles = checkedFiles;
    state.mismatches = mismatches;
    state.missingFiles = missingFiles;

    if (mismatches.length || missingFiles.length) {
      state.status = "failed";
      state.reason = "integrity-divergence-detected";
    } else {
      state.status = "ok";
      state.reason = "integrity-verified";
    }

    return getStatus();
  }

  function getStatus() {
    return {
      status: state.status,
      reason: state.reason,
      lastCheckedAt: state.lastCheckedAt,
      staleAfterMs: state.staleAfterMs,
      checkedFiles: [...state.checkedFiles],
      mismatches: [...state.mismatches],
      missingFiles: [...state.missingFiles],
    };
  }

  async function getOrRefresh({ force = false } = {}) {
    if (!force && state.lastCheckedAt) {
      const ageMs = Date.now() - new Date(state.lastCheckedAt).getTime();
      if (ageMs <= state.staleAfterMs) {
        return getStatus();
      }
    }
    return runCheck();
  }

  return {
    runCheck,
    getStatus,
    getOrRefresh,
  };
}

function buildCorsOriginValidator(configuredOrigin) {
  if (configuredOrigin === true || configuredOrigin === false) {
    return configuredOrigin;
  }

  const configuredOrigins = Array.isArray(configuredOrigin)
    ? configuredOrigin.map((origin) => String(origin).trim()).filter(Boolean)
    : parseOriginList(configuredOrigin);

  const allowlist = new Set(
    configuredOrigins.length
      ? configuredOrigins
      : ["http://localhost:3001", "http://127.0.0.1:3001"],
  );

  return (origin, callback) => {
    // Requests sem header Origin (curl, health checks e chamadas same-origin)
    // continuam permitidos.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowlist.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new HttpError(403, "Origem nao permitida pelo CORS"));
  };
}

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

  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: process.env.JSON_LIMIT || "32mb" }));

  // Response compression for JSON and text
  app.use(compression());

  // HTTP logging with trace IDs
  app.use(createHttpLogger());
  app.use((req, res, next) => {
    req.logger = logger.child({ traceId: req.id });
    next();
  });
  // Devolve o traceId em toda resposta API para correlacao com o frontend.
  app.use((req, res, next) => {
    if (req.id) res.setHeader("x-trace-id", req.id);
    next();
  });
  app.use(createTelemetryMiddleware());

  // Cache headers for static assets
  app.use(
    express.static(webDir, {
      maxAge: "1d",
      etag: false,
      dotfiles: "ignore",
    }),
  );

  app.use("/api", roleLimiter.createMiddleware("api"));
  app.use("/api/chat", roleLimiter.createMiddleware("chat"));
  app.use("/api/chat-stream", roleLimiter.createMiddleware("chat"));

  app.locals.backupService = backupService;
  app.locals.storageService = storageService;
  app.locals.capacityService = capacityService;
  app.locals.queueService = queueService;
  app.locals.baselineService = baselineService;
  app.locals.approvalService = approvalService;

  app.get("/healthz", (req, res) => {
    req.logger?.info({ uptime: process.uptime() }, "Liveness check");
    res.status(200).json({ status: "ok", service: "chat-server" });
  });

  registerHealthRoutes(app, {
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
  });

  registerChatRoutes(app, {
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
  });

  registerRagRoutes(app, {
    asyncHandler,
    assertBodyObject,
    parseChatId,
    parseRagDocuments,
    parseSearchQuery,
    recordBlockedAttempt,
    clamp,
    store,
  });

  registerUserRoutes(app, {
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
  });

  registerChatsRoutes(app, {
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
  });

  registerBackupRoutes(app, {
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
  });

  registerIncidentRoutes(app, {
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
  });

  registerResilienceRoutes(app, {
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
  });

  registerStorageRoutes(app, {
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
  });

  registerConfigRoutes(app, {
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
  });

  registerApprovalRoutes(app, {
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
  });

  registerAuditRoutes(app, {
    asyncHandler,
    requireMinimumRole,
    parseAuditFilters,
    store,
  });

  registerObservabilityRoutes(app, {
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
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Endpoint nao encontrado" });
  });

  app.get("/app", (_req, res) => {
    res.sendFile(path.join(webDir, "index.html"));
  });

  app.get("/produto", (_req, res) => {
    res.sendFile(path.join(webDir, "produto.html"));
  });

  app.get("/guia", (_req, res) => {
    res.sendFile(path.join(webDir, "guia.html"));
  });

  app.get("/", (_req, res) => {
    res.sendFile(path.join(webDir, "index.html"));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err instanceof HttpError ? err.status : 500;
    const message =
      err instanceof HttpError ? err.message : "Erro interno do servidor";

    req.logger?.error(
      {
        error: err.message,
        stack: err.stack,
        traceId: req.id,
      },
      `${status} ${message}`,
    );

    if (res.headersSent) {
      return;
    }

    if (req.path.startsWith("/api")) {
      res.status(status).json({ error: message, traceId: req.id || null });
      return;
    }

    res.status(status).send(message);
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
