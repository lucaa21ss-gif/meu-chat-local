import express from "express";
import cors from "cors";
import compression from "compression";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  statfs,
  readdir as fsReaddir,
  stat as fsStat,
  readFile as fsReadFile,
  mkdir as fsMkdir,
  writeFile as fsWriteFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import helmet from "helmet";
import { client } from "./ollama.js";
import { createRoleLimiterQueue } from "./rateLimiter.js";
import logger, { createHttpLogger } from "./logger.js";
import {
  initDb,
  closeDb,
  getDbPath,
  createDbSnapshot,
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
import {
  createBackupArchive,
  restoreBackupArchive,
  validateBackupArchive,
} from "./backup.js";
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
  sleep,
  withTimeout,
} from "./src/shared/model-recovery.js";
import {
  AUTO_HEALING_POLICIES,
  CONFIG_KEYS,
  HEALTH_STATUS,
  INCIDENT_RUNBOOK_TYPES,
  INCIDENT_STATUS_TRANSITIONS,
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
  parseDirList,
  parseDisasterScenarioId,
  parseIncidentNextUpdateAt,
  parseIncidentOwner,
  parseIncidentRecommendationType,
  parseIncidentRunbookMode,
  parseIncidentRunbookType,
  parseIncidentSeverity,
  parseIncidentStatus,
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
import { registerChatRoutes } from "./src/modules/chat/register-chat-routes.js";
import { registerChatsRoutes } from "./src/modules/chat/register-chats-routes.js";
import { registerRagRoutes } from "./src/modules/chat/register-rag-routes.js";
import { registerBackupRoutes } from "./src/modules/governance/register-backup-routes.js";
import { registerHealthRoutes } from "./src/modules/health/register-health-routes.js";

async function pruneBackups(backupRoot, maxFiles) {
  if (!Number.isFinite(maxFiles) || maxFiles < 1) return;
  const fs = await import("node:fs/promises");
  let entries = [];
  try {
    entries = await fs.readdir(backupRoot, { withFileTypes: true });
  } catch {
    return;
  }

  const files = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.startsWith("meu-chat-local-backup-") &&
          entry.name.endsWith(".tgz"),
      )
      .map(async (entry) => {
        const fullPath = path.join(backupRoot, entry.name);
        const stat = await fs.stat(fullPath);
        return { fullPath, mtimeMs: stat.mtimeMs };
      }),
  );

  files
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(maxFiles)
    .forEach(async (item) => {
      try {
        await fs.rm(item.fullPath, { force: true });
      } catch {
        // Ignore pruning failures.
      }
    });
}

function createDefaultBackupService(config = {}) {
  const dbPath = config.dbPath || getDbPath();
  const backupRoot =
    config.backupRoot || path.join(path.dirname(dbPath), "backups");
  const includeDirs = parseDirList(config.includeDirs || ["uploads", "documents"]);
  const backupKeep = parsePositiveInt(config.backupKeep, 10, 1, 100);

  function summarizeValidationStatus(items = []) {
    if (!items.length) return "alerta";
    if (items.some((item) => item.status === "falha")) return "falha";
    if (items.some((item) => item.status === "alerta")) return "alerta";
    return "ok";
  }

  return {
    async createBackup(options = {}) {
      const info = await createBackupArchive({
        dbPath,
        includeDirs,
        backupRoot,
        createDbSnapshot,
        passphrase: options.passphrase,
      });
      await pruneBackups(backupRoot, backupKeep);
      return info;
    },
    async restoreBackup(buffer, options = {}) {
      return restoreBackupArchive({
        archiveBuffer: buffer,
        dbPath,
        includeDirs,
        closeDb,
        initDb,
        passphrase: options.passphrase,
      });
    },
    async validateRecentBackups(options = {}) {
      const limit = parsePositiveInt(options.limit, 3, 1, 20);
      const passphrase = String(options.passphrase || "").trim() || null;

      let entries = [];
      try {
        entries = await fsReaddir(backupRoot, { withFileTypes: true });
      } catch {
        return {
          checkedAt: new Date().toISOString(),
          status: "alerta",
          reason: "Diretorio de backups indisponivel",
          limit,
          items: [],
        };
      }

      const candidates = await Promise.all(
        entries
          .filter((entry) => entry.isFile())
          .filter((entry) => {
            const name = entry.name;
            return (
              name.startsWith("meu-chat-local-backup-") &&
              (name.endsWith(".tgz") || name.endsWith(".tgz.enc"))
            );
          })
          .map(async (entry) => {
            const fullPath = path.join(backupRoot, entry.name);
            const stats = await fsStat(fullPath);
            return {
              fileName: entry.name,
              fullPath,
              mtimeMs: stats.mtimeMs,
              sizeBytes: stats.size,
            };
          }),
      );

      const selected = candidates
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
        .slice(0, limit);

      if (!selected.length) {
        return {
          checkedAt: new Date().toISOString(),
          status: "alerta",
          reason: "Nenhum arquivo de backup encontrado",
          limit,
          items: [],
        };
      }

      const items = [];
      for (const candidate of selected) {
        try {
          const archiveBuffer = await fsReadFile(candidate.fullPath);
          const result = await validateBackupArchive({
            archiveBuffer,
            passphrase,
          });
          items.push({
            fileName: candidate.fileName,
            sizeBytes: candidate.sizeBytes,
            mtime: new Date(candidate.mtimeMs).toISOString(),
            status: "ok",
            encrypted: !!result.encrypted,
            manifest: result.manifest,
          });
        } catch (error) {
          const message = String(error?.message || "Falha ao validar backup");
          const lower = message.toLowerCase();
          const missingPassphrase =
            lower.includes("passphrase") &&
            lower.includes("informe");
          items.push({
            fileName: candidate.fileName,
            sizeBytes: candidate.sizeBytes,
            mtime: new Date(candidate.mtimeMs).toISOString(),
            status: missingPassphrase ? "alerta" : "falha",
            error: message,
          });
        }
      }

      return {
        checkedAt: new Date().toISOString(),
        limit,
        status: summarizeValidationStatus(items),
        items,
      };
    },
  };
}

function createDefaultIncidentService(config = {}) {
  const now = new Date().toISOString();
  const initial = {
    version: 1,
    status: parseIncidentStatus(config.status, "normal"),
    severity: parseIncidentSeverity(config.severity, "info"),
    summary:
      parseIncidentSummary(config.summary) ||
      "Operacao normal - nenhum incidente ativo",
    owner: parseIncidentOwner(config.owner),
    recommendationType: parseIncidentRecommendationType(
      config.recommendationType,
    ),
    startedAt: now,
    nextUpdateAt: parseIncidentNextUpdateAt(config.nextUpdateAt),
    updatedAt: now,
    updatedBy: null,
    history: [],
  };

  let state = initial;

  return {
    getStatus() {
      return {
        ...state,
        history: [...state.history],
      };
    },
    updateStatus(patch = {}, actorUserId = null) {
      const nextStatus = patch.status || state.status;
      const hasStatusChange = patch.status && patch.status !== state.status;

      if (hasStatusChange) {
        const allowed = INCIDENT_STATUS_TRANSITIONS[state.status] || new Set();
        if (!allowed.has(nextStatus)) {
          throw new HttpError(
            400,
            `Transicao de incidente invalida: ${state.status} -> ${nextStatus}`,
          );
        }
      }

      const timestamp = new Date().toISOString();
      const updated = {
        ...state,
        ...patch,
        status: nextStatus,
        severity: patch.severity || state.severity,
        summary: patch.summary === null ? state.summary : patch.summary || state.summary,
        owner: patch.owner === undefined ? state.owner : patch.owner,
        recommendationType:
          patch.recommendationType === undefined
            ? state.recommendationType
            : patch.recommendationType,
        nextUpdateAt:
          patch.nextUpdateAt === undefined ? state.nextUpdateAt : patch.nextUpdateAt,
        updatedAt: timestamp,
        updatedBy: actorUserId,
      };

      const transitionEntry = {
        at: timestamp,
        fromStatus: state.status,
        toStatus: updated.status,
        severity: updated.severity,
        by: actorUserId,
      };

      updated.history = [transitionEntry, ...(state.history || [])].slice(0, 20);
      state = updated;
      return this.getStatus();
    },
  };
}

function createDefaultAutoHealingService({
  healthProviders,
  store,
  chatClient,
  ollamaFallbackModel,
  ollamaMaxAttempts,
  ollamaTimeoutMs,
  ollamaRetryDelays,
  state: config = {},
} = {}) {
  const policyState = {
    "model-offline": {
      lastAttemptAt: null,
      lastOutcome: "idle",
      lastError: null,
      trigger: null,
      failureTimestamps: [],
      nextAllowedAtMs: 0,
      details: null,
    },
    "db-lock": {
      lastAttemptAt: null,
      lastOutcome: "idle",
      lastError: null,
      trigger: null,
      failureTimestamps: [],
      nextAllowedAtMs: 0,
      details: null,
    },
  };

  const state = {
    enabled: parseBooleanLike(config.enabled, false),
    cooldownMs: parsePositiveInt(config.cooldownMs, 30_000, 0, 3_600_000),
    maxAttempts: parsePositiveInt(config.maxAttempts, 3, 1, 20),
    windowMs: parsePositiveInt(config.windowMs, 300_000, 1_000, 86_400_000),
    paused: false,
    pausedReason: null,
    lastEvaluation: null,
    updatedAt: new Date().toISOString(),
  };

  function pruneFailures(policy, nowMs) {
    const threshold = nowMs - state.windowMs;
    policyState[policy].failureTimestamps = policyState[policy].failureTimestamps.filter(
      (ts) => ts >= threshold,
    );
  }

  function getStatus() {
    return {
      enabled: state.enabled,
      cooldownMs: state.cooldownMs,
      maxAttempts: state.maxAttempts,
      windowMs: state.windowMs,
      paused: state.paused,
      pausedReason: state.pausedReason,
      updatedAt: state.updatedAt,
      lastEvaluation: state.lastEvaluation,
      policies: Object.fromEntries(
        AUTO_HEALING_POLICIES.map((policy) => {
          const current = policyState[policy];
          return [
            policy,
            {
              lastAttemptAt: current.lastAttemptAt,
              lastOutcome: current.lastOutcome,
              lastError: current.lastError,
              trigger: current.trigger,
              recentFailures: current.failureTimestamps.length,
              nextAllowedAt:
                current.nextAllowedAtMs > 0
                  ? new Date(current.nextAllowedAtMs).toISOString()
                  : null,
              details: current.details,
            },
          ];
        }),
      ),
    };
  }

  function patchConfig(patch = {}) {
    if (patch.enabled !== undefined) state.enabled = !!patch.enabled;
    if (patch.cooldownMs !== undefined) state.cooldownMs = patch.cooldownMs;
    if (patch.maxAttempts !== undefined) state.maxAttempts = patch.maxAttempts;
    if (patch.windowMs !== undefined) state.windowMs = patch.windowMs;
    if (patch.resetCircuit) {
      state.paused = false;
      state.pausedReason = null;
      for (const policy of AUTO_HEALING_POLICIES) {
        policyState[policy].failureTimestamps = [];
      }
    }
    state.updatedAt = new Date().toISOString();
    return getStatus();
  }

  async function runPolicyAction(policy) {
    if (policy === "model-offline") {
      const { modelUsed, attempt } = await executeWithModelRecovery({
        primaryModel: "meu-llama3",
        fallbackModel: ollamaFallbackModel,
        maxAttempts: ollamaMaxAttempts,
        timeoutMs: Math.min(ollamaTimeoutMs, 10_000),
        retryDelays: ollamaRetryDelays,
        logger,
        run: (model) =>
          chatClient.chat({
            model,
            stream: false,
            messages: [{ role: "user", content: "auto-healing ping" }],
            options: { temperature: 0, num_ctx: 256 },
          }),
      });
      return { modelUsed, attempt };
    }

    if (policy === "db-lock") {
      await store.listChats("user-default", { limit: 1 });
      return { dbProbe: "listChats" };
    }

    throw new HttpError(400, "Politica de auto-healing nao suportada");
  }

  async function executePolicy(policy, { trigger = "manual", healthChecks = null } = {}) {
    const current = policyState[policy];
    const nowMs = Date.now();

    if (!state.enabled) {
      const result = {
        executed: false,
        policy,
        outcome: "skipped",
        reason: "disabled",
        at: new Date(nowMs).toISOString(),
      };
      state.lastEvaluation = result;
      return result;
    }

    if (state.paused) {
      const result = {
        executed: false,
        policy,
        outcome: "skipped",
        reason: "circuit-open",
        at: new Date(nowMs).toISOString(),
      };
      state.lastEvaluation = result;
      return result;
    }

    if (nowMs < current.nextAllowedAtMs) {
      const result = {
        executed: false,
        policy,
        outcome: "skipped",
        reason: "cooldown",
        nextAllowedAt: new Date(current.nextAllowedAtMs).toISOString(),
        at: new Date(nowMs).toISOString(),
      };
      state.lastEvaluation = result;
      return result;
    }

    pruneFailures(policy, nowMs);
    if (current.failureTimestamps.length >= state.maxAttempts) {
      state.paused = true;
      state.pausedReason = `${policy}: limite de tentativas excedido`;
      const result = {
        executed: false,
        policy,
        outcome: "skipped",
        reason: "circuit-open",
        at: new Date(nowMs).toISOString(),
      };
      state.lastEvaluation = result;
      return result;
    }

    let isFailing = true;
    if (healthChecks) {
      if (policy === "model-offline") {
        isFailing = healthChecks.model?.status !== HEALTH_STATUS.HEALTHY;
      }
      if (policy === "db-lock") {
        isFailing = healthChecks.db?.status !== HEALTH_STATUS.HEALTHY;
      }
    }

    if (!isFailing) {
      const result = {
        executed: false,
        policy,
        outcome: "skipped",
        reason: "no-failure-detected",
        at: new Date(nowMs).toISOString(),
      };
      state.lastEvaluation = result;
      return result;
    }

    current.lastAttemptAt = new Date(nowMs).toISOString();
    current.nextAllowedAtMs = nowMs + state.cooldownMs;
    current.trigger = trigger;

    try {
      const details = await runPolicyAction(policy);
      current.lastOutcome = "success";
      current.lastError = null;
      current.details = details;
      const result = {
        executed: true,
        policy,
        outcome: "success",
        details,
        at: current.lastAttemptAt,
      };
      state.lastEvaluation = result;
      return result;
    } catch (error) {
      current.failureTimestamps.push(nowMs);
      pruneFailures(policy, nowMs);
      current.lastOutcome = "failed";
      current.lastError = String(error?.message || error);
      current.details = null;

      if (current.failureTimestamps.length >= state.maxAttempts) {
        state.paused = true;
        state.pausedReason = `${policy}: limite de tentativas excedido`;
      }

      const result = {
        executed: true,
        policy,
        outcome: "failed",
        error: current.lastError,
        paused: state.paused,
        at: current.lastAttemptAt,
      };
      state.lastEvaluation = result;
      return result;
    }
  }

  async function evaluate({ healthChecks = null } = {}) {
    if (!state.enabled) {
      const now = new Date().toISOString();
      const result = {
        executed: false,
        policy: null,
        outcome: "skipped",
        reason: "disabled",
        at: now,
      };
      state.lastEvaluation = result;
      return result;
    }

    const checks =
      healthChecks ||
      {
        db: await healthProviders.checkDb(),
        model: await healthProviders.checkModel(),
      };

    if (checks.model?.status !== HEALTH_STATUS.HEALTHY) {
      return executePolicy("model-offline", { trigger: "auto", healthChecks: checks });
    }
    if (checks.db?.status !== HEALTH_STATUS.HEALTHY) {
      return executePolicy("db-lock", { trigger: "auto", healthChecks: checks });
    }

    const result = {
      executed: false,
      policy: null,
      outcome: "skipped",
      reason: "no-failure-detected",
      at: new Date().toISOString(),
    };
    state.lastEvaluation = result;
    return result;
  }

  return {
    getStatus,
    patchConfig,
    executePolicy,
    evaluate,
  };
}

function createDefaultDisasterRecoveryService({
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
      for (let i = 0; i < 20; i += 1) {
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
      const status = restored && healthStatus !== HEALTH_STATUS.UNHEALTHY ? "passed" : "failed";

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

function createQueueService({
  maxConcurrency = 4,
  maxQueueSize = 100,
  taskTimeoutMs = 30000,
  rejectPolicy = "reject",
} = {}) {
  const queue = [];
  let activeCount = 0;
  let completedCount = 0;
  let rejectedCount = 0;
  let failedCount = 0;
  const waitTimes = [];
  let lastActivityAt = new Date().toISOString();

  async function processQueue() {
    while (activeCount < maxConcurrency && queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      activeCount += 1;
      lastActivityAt = new Date().toISOString();
      const enqueuedAt = item.enqueuedAt;
      const waitTimeMs = Date.now() - enqueuedAt;
      waitTimes.push(waitTimeMs);
      if (waitTimes.length > 1000) waitTimes.shift(); // Keep sliding window

      try {
        const timeoutPromise = new Promise((_, reject) => {
          const timeoutHandle = setTimeout(() => {
            reject(new Error(`Task timeout after ${taskTimeoutMs}ms`));
          }, taskTimeoutMs);
          item.timeoutHandle = timeoutHandle;
        });

        const result = await Promise.race([item.fn(), timeoutPromise]);
        item.resolve(result);
        completedCount += 1;
      } catch (error) {
        item.reject(error);
        failedCount += 1;
      } finally {
        clearTimeout(item.timeoutHandle);
        activeCount -= 1;
        lastActivityAt = new Date().toISOString();
        // Continue processing queue
        setImmediate(processQueue);
      }
    }
  }

  function enqueue(taskId, fn, priority = 0) {
    if (typeof fn !== "function") {
      return Promise.reject(new Error("fn must be a function"));
    }

    if (queue.length >= maxQueueSize) {
      rejectedCount += 1;
      lastActivityAt = new Date().toISOString();
      if (rejectPolicy === "reject") {
        return Promise.reject(
          new Error(
            `Queue full: ${queue.length}/${maxQueueSize} (active: ${activeCount})`,
          ),
        );
      }
    }

    return new Promise((resolve, reject) => {
      const item = {
        taskId,
        fn,
        priority,
        enqueuedAt: Date.now(),
        resolve,
        reject,
        timeoutHandle: null,
      };

      // Insert by priority (higher first)
      let insertedAt = queue.length;
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].priority < priority) {
          insertedAt = i;
          break;
        }
      }
      queue.splice(insertedAt, 0, item);
      lastActivityAt = new Date().toISOString();

      // Start processing if not at max capacity
      if (activeCount < maxConcurrency) {
        setImmediate(processQueue);
      }
    });
  }

  function getMetrics() {
    const avgWaitTimeMs =
      waitTimes.length > 0
        ? Math.round(
          waitTimes.reduce((sum, t) => sum + t, 0) / waitTimes.length,
        )
        : 0;

    return {
      activeCount,
      queuedCount: queue.length,
      completedCount,
      rejectedCount,
      failedCount,
      averageWaitTimeMs: avgWaitTimeMs,
      maxConcurrency,
      maxQueueSize,
      taskTimeoutMs,
      lastActivityAt,
    };
  }

  function getHealth() {
    const metrics = getMetrics();
    const utilizationPercent = Math.round(
      ((metrics.activeCount + metrics.queuedCount) / maxConcurrency) * 100,
    );

    return {
      status:
        metrics.rejectedCount > 0 || utilizationPercent > 80
          ? "degraded"
          : "healthy",
      metrics,
      utilizationPercent,
      saturationLevel:
        utilizationPercent < 50
          ? "low"
          : utilizationPercent < 80
            ? "medium"
            : "high",
    };
  }

  function shutdown() {
    // Reject all pending tasks
    for (const item of queue) {
      item.reject(new Error("Queue service is shutting down"));
      clearTimeout(item.timeoutHandle);
    }
    queue.length = 0;
  }

  return {
    enqueue,
    getMetrics,
    getHealth,
    shutdown,
  };
}

function createBaselineService({ baselinePath, getConfig }) {
  async function load() {
    try {
      const raw = await fsReadFile(baselinePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function save() {
    const config = getConfig();
    const record = { config, savedAt: new Date().toISOString() };
    await fsMkdir(path.dirname(baselinePath), { recursive: true });
    await fsWriteFile(baselinePath, JSON.stringify(record, null, 2), "utf-8");
    return record;
  }

  async function check() {
    const checkedAt = new Date().toISOString();
    const saved = await load();
    const current = getConfig();

    if (!saved) {
      return {
        hasSaved: false,
        status: "not-configured",
        baseline: null,
        current,
        driftedKeys: [],
        checkedAt,
      };
    }

    const baseline = saved.config;
    const driftedKeys = [];

    function deepEqual(a, b) {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    for (const key of Object.keys(baseline)) {
      if (!deepEqual(baseline[key], current[key])) {
        driftedKeys.push(key);
      }
    }
    for (const key of Object.keys(current)) {
      if (!(key in baseline) && !driftedKeys.includes(key)) {
        driftedKeys.push(key);
      }
    }

    return {
      hasSaved: true,
      status: driftedKeys.length > 0 ? "drift" : "ok",
      baseline,
      current,
      driftedKeys,
      savedAt: saved.savedAt,
      checkedAt,
    };
  }

  return { load, save, check };
}

function createOperationalApprovalService({ approvalsPath, now = () => Date.now() }) {
  async function readApprovals() {
    try {
      const raw = await fsReadFile(approvalsPath, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.approvals) ? parsed.approvals : [];
    } catch {
      return [];
    }
  }

  async function writeApprovals(approvals) {
    await fsMkdir(path.dirname(approvalsPath), { recursive: true });
    await fsWriteFile(
      approvalsPath,
      JSON.stringify({ approvals, updatedAt: new Date(now()).toISOString() }, null, 2),
      "utf-8",
    );
  }

  function applyExpiration(approvals) {
    const nowIso = new Date(now()).toISOString();
    let changed = false;
    const next = approvals.map((item) => {
      if (item.status === "approved" && item.windowEndAt && new Date(item.windowEndAt).getTime() < now()) {
        changed = true;
        return {
          ...item,
          status: "expired",
          result: "expired",
          updatedAt: nowIso,
        };
      }
      return item;
    });
    return { approvals: next, changed };
  }

  async function createRequest({ action, requestedBy, reason, windowMinutes }) {
    const approvals = await readApprovals();
    const timestamp = now();
    const createdAt = new Date(timestamp).toISOString();
    const request = {
      id: `approval-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      status: "pending",
      requestedBy,
      requestReason: reason,
      decisionReason: null,
      approvedBy: null,
      deniedBy: null,
      consumedBy: null,
      result: "pending",
      windowMinutes,
      windowStartAt: null,
      windowEndAt: null,
      createdAt,
      decidedAt: null,
      consumedAt: null,
      updatedAt: createdAt,
    };
    approvals.unshift(request);
    await writeApprovals(approvals);
    return request;
  }

  async function decide({ approvalId, decision, decidedBy, reason }) {
    const approvals = await readApprovals();
    const { approvals: withExpiration, changed } = applyExpiration(approvals);
    const idx = withExpiration.findIndex((item) => item.id === approvalId);
    if (idx < 0) throw new HttpError(404, "Aprovacao nao encontrada");

    const current = withExpiration[idx];
    if (current.status !== "pending") {
      throw new HttpError(409, "Aprovacao nao esta pendente");
    }

    const decidedAt = new Date(now()).toISOString();
    if (decision === "approve") {
      withExpiration[idx] = {
        ...current,
        status: "approved",
        result: "approved",
        approvedBy: decidedBy,
        decisionReason: reason,
        decidedAt,
        windowStartAt: decidedAt,
        windowEndAt: new Date(now() + current.windowMinutes * 60 * 1000).toISOString(),
        updatedAt: decidedAt,
      };
    } else {
      withExpiration[idx] = {
        ...current,
        status: "denied",
        result: "denied",
        deniedBy: decidedBy,
        decisionReason: reason,
        decidedAt,
        updatedAt: decidedAt,
      };
    }

    await writeApprovals(withExpiration);
    if (changed) {
      return withExpiration[idx];
    }
    return withExpiration[idx];
  }

  async function consume({ approvalId, action, actorUserId }) {
    const approvals = await readApprovals();
    const { approvals: withExpiration } = applyExpiration(approvals);
    const idx = withExpiration.findIndex((item) => item.id === approvalId);
    if (idx < 0) throw new HttpError(403, "Aprovacao operacional invalida");

    const approval = withExpiration[idx];
    if (approval.action !== action) {
      throw new HttpError(403, "Aprovacao nao corresponde a acao solicitada");
    }
    if (approval.status === "expired") {
      await writeApprovals(withExpiration);
      throw new HttpError(410, "Aprovacao operacional expirada");
    }
    if (approval.status === "denied") {
      throw new HttpError(403, "Aprovacao operacional negada");
    }
    if (approval.status !== "approved") {
      throw new HttpError(403, "Aprovacao operacional pendente");
    }
    if (approval.consumedAt) {
      throw new HttpError(409, "Aprovacao operacional ja consumida");
    }

    const consumedAt = new Date(now()).toISOString();
    withExpiration[idx] = {
      ...approval,
      status: "consumed",
      result: "executed",
      consumedBy: actorUserId,
      consumedAt,
      updatedAt: consumedAt,
    };
    await writeApprovals(withExpiration);
    return withExpiration[idx];
  }

  async function list({ status = "all", page = 1, limit = 20 } = {}) {
    const approvals = await readApprovals();
    const { approvals: withExpiration, changed } = applyExpiration(approvals);
    if (changed) {
      await writeApprovals(withExpiration);
    }
    const filtered =
      status === "all"
        ? withExpiration
        : withExpiration.filter((item) => item.status === status);
    const safePage = parsePositiveInt(page, 1, 1, 1000);
    const safeLimit = parsePositiveInt(limit, 20, 1, 200);
    const start = (safePage - 1) * safeLimit;
    const items = filtered.slice(start, start + safeLimit);
    return {
      items,
      page: safePage,
      limit: safeLimit,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / safeLimit)),
    };
  }

  return {
    createRequest,
    decide,
    consume,
    list,
  };
}

function createScorecardService({ scorecardPath, now = () => new Date().toISOString() }) {
  function buildStatus(dimensions) {
    const statuses = dimensions.map((d) => d.status);
    if (statuses.some((s) => s === "critico")) return "critico";
    if (statuses.some((s) => s === "alerta")) return "alerta";
    return "ok";
  }

  function healthDimension(health) {
    const s = health?.status;
    return {
      name: "health",
      label: "Saude do sistema",
      status: s === "healthy" ? "ok" : s === "degraded" ? "alerta" : s === "unhealthy" ? "critico" : "ok",
      detail: { status: s, checks: health?.checks },
    };
  }

  function sloDimension(slo) {
    const s = slo?.status;
    return {
      name: "slo",
      label: "SLO de disponibilidade e latencia",
      status: s === "ok" ? "ok" : s === "alerta" ? "alerta" : "ok",
      detail: { status: s, evaluatedRoutes: slo?.evaluatedRoutes },
    };
  }

  function backupDimension(backupValidation) {
    const s = backupValidation?.status;
    return {
      name: "backup",
      label: "Validacao de backups recentes",
      status: s === "ok" ? "ok" : s === "alerta" ? "alerta" : s === "falha" ? "critico" : "ok",
      detail: { status: s, items: backupValidation?.items },
    };
  }

  function integrityDimension(integrity) {
    const s = integrity?.status;
    return {
      name: "integrity",
      label: "Integridade de artefatos criticos",
      status: s === "ok" ? "ok" : s === "failed" ? "critico" : "ok",
      detail: { status: s, mismatches: integrity?.mismatches?.length ?? 0 },
    };
  }

  function capacityDimension(capacity) {
    const s = capacity?.status;
    return {
      name: "capacity",
      label: "Orcamento de capacidade",
      status: s === "approved" ? "ok" : s === "alerta" ? "alerta" : s === "blocked" ? "critico" : "ok",
      detail: { status: s, totals: capacity?.totals },
    };
  }

  function autoHealingDimension(autoHealing) {
    const circuit = autoHealing?.circuit;
    const s = autoHealing?.enabled === false ? "alerta" : circuit === "open" ? "alerta" : "ok";
    return {
      name: "auto-healing",
      label: "Auto-healing e recuperacao automatica",
      status: s,
      detail: { enabled: autoHealing?.enabled, circuit, attempts: autoHealing?.attemptCount },
    };
  }

  function incidentDimension(incident) {
    const s = incident?.status;
    return {
      name: "incident",
      label: "Status de incidente operacional",
      status: s === "normal" ? "ok" : s === "resolved" ? "ok" : s === "investigating" || s === "mitigating" ? "alerta" : "ok",
      detail: { status: s, severity: incident?.severity, summary: incident?.summary },
    };
  }

  function baselineDimension(baseline) {
    const s = baseline?.status;
    return {
      name: "baseline",
      label: "Drift de configuracao",
      status: s === "ok" ? "ok" : s === "drift" ? "alerta" : "ok",
      detail: { status: s, driftedKeys: baseline?.driftedKeys, checkedAt: baseline?.checkedAt },
    };
  }

  function pendingApprovalsDimension(pendingApprovals) {
    const count = pendingApprovals ?? 0;
    return {
      name: "approvals",
      label: "Aprovacoes operacionais pendentes",
      status: count > 0 ? "alerta" : "ok",
      detail: { pendingCount: count },
    };
  }

  function queueDimension(queue) {
    const saturated = queue && (queue.rejectedCount > 0 || (queue.queuedCount + queue.activeCount) > (queue.maxConcurrency * 2));
    return {
      name: "queue",
      label: "Fila de operacoes",
      status: saturated ? "alerta" : "ok",
      detail: { activeCount: queue?.activeCount, queuedCount: queue?.queuedCount, rejectedCount: queue?.rejectedCount },
    };
  }

  function buildRecommendations(dimensions) {
    const recs = [];
    for (const dim of dimensions) {
      if (dim.status === "critico") {
        recs.push({ dimension: dim.name, severity: "critical", action: `Dimensao ${dim.label} em estado critico — intervencao imediata necessaria` });
      } else if (dim.status === "alerta") {
        recs.push({ dimension: dim.name, severity: "medium", action: `Dimensao ${dim.label} em alerta — revisar e planejar correcao` });
      }
    }
    if (!recs.length) {
      recs.push({ dimension: "all", severity: "info", action: "Todos os indicadores operacionais estao saudaveis" });
    }
    return recs;
  }

  async function generate({
    health,
    slo,
    backupValidation,
    integrity,
    capacity,
    autoHealing,
    incident,
    baseline,
    pendingApprovals,
    queue,
  }) {
    const dimensions = [
      healthDimension(health),
      sloDimension(slo),
      backupDimension(backupValidation),
      integrityDimension(integrity),
      capacityDimension(capacity),
      autoHealingDimension(autoHealing),
      incidentDimension(incident),
      baselineDimension(baseline),
      pendingApprovalsDimension(pendingApprovals),
      queueDimension(queue),
    ];

    const status = buildStatus(dimensions);
    const recommendations = buildRecommendations(dimensions);
    const generatedAt = now();

    const scorecard = {
      version: 1,
      generatedAt,
      status,
      dimensions,
      recommendations,
    };

    await fsMkdir(path.dirname(scorecardPath), { recursive: true });
    await fsWriteFile(scorecardPath, JSON.stringify(scorecard, null, 2), "utf-8");

    return scorecard;
  }

  return { generate };
}

function buildCapacityEmptySummary(reason = "capacity-report-missing") {
  return {
    status: "unknown",
    reason,
    generatedAt: null,
    reportPath: null,
    thresholds: null,
    totals: {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      errorRate: 0,
      throughputRps: 0,
    },
    endpoints: [],
  };
}

function createCapacityProfileService({
  baseDir,
  artifactsDir,
  reportFileName = "capacity-report.json",
} = {}) {
  async function resolveLatestReportPath() {
    const preferredPath = path.join(artifactsDir, reportFileName);
    try {
      await fsStat(preferredPath);
      return preferredPath;
    } catch {
      // Fallback para o arquivo mais recente caso o nome padrao mude.
    }

    let entries = [];
    try {
      entries = await fsReaddir(artifactsDir, { withFileTypes: true });
    } catch {
      return null;
    }

    const candidates = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => {
          const fullPath = path.join(artifactsDir, entry.name);
          const stats = await fsStat(fullPath);
          return {
            fullPath,
            mtimeMs: stats.mtimeMs,
          };
        }),
    );

    if (!candidates.length) return null;
    candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
    return candidates[0].fullPath;
  }

  function summarizeEndpoint(endpoint = {}) {
    return {
      name: endpoint.name || "unknown",
      method: endpoint.method || "GET",
      path: endpoint.path || null,
      requestCount: Number(endpoint.requestCount || 0),
      successCount: Number(endpoint.successCount || 0),
      errorCount: Number(endpoint.errorCount || 0),
      errorRate:
        typeof endpoint.errorRate === "number" ? endpoint.errorRate : 0,
      throughputRps:
        typeof endpoint.throughputRps === "number" ? endpoint.throughputRps : 0,
      latencyMs: {
        p50:
          typeof endpoint.latencyMs?.p50 === "number"
            ? endpoint.latencyMs.p50
            : null,
        p95:
          typeof endpoint.latencyMs?.p95 === "number"
            ? endpoint.latencyMs.p95
            : null,
        p99:
          typeof endpoint.latencyMs?.p99 === "number"
            ? endpoint.latencyMs.p99
            : null,
      },
      budget: {
        status: endpoint.budget?.status || "unknown",
        reasons: Array.isArray(endpoint.budget?.reasons)
          ? endpoint.budget.reasons
          : [],
      },
    };
  }

  function summarizeReport(report, reportPath) {
    const endpoints = Array.isArray(report?.endpoints)
      ? report.endpoints.map((endpoint) => summarizeEndpoint(endpoint))
      : [];

    return {
      status: report?.budgets?.status || report?.status || "unknown",
      reason:
        Array.isArray(report?.budgets?.reasons) && report.budgets.reasons.length
          ? report.budgets.reasons.join("; ")
          : endpoints.some((item) => item.budget.status === "blocked")
            ? "capacity-budget-violated"
            : "capacity-report-ready",
      generatedAt: report?.generatedAt || null,
      reportPath: reportPath ? path.relative(baseDir, reportPath) : null,
      thresholds: report?.thresholds || null,
      totals: {
        requestCount: Number(report?.totals?.requestCount || 0),
        successCount: Number(report?.totals?.successCount || 0),
        errorCount: Number(report?.totals?.errorCount || 0),
        errorRate:
          typeof report?.totals?.errorRate === "number"
            ? report.totals.errorRate
            : 0,
        throughputRps:
          typeof report?.totals?.throughputRps === "number"
            ? report.totals.throughputRps
            : 0,
      },
      endpoints,
    };
  }

  async function getLatestSummary() {
    const reportPath = await resolveLatestReportPath();
    if (!reportPath) {
      return buildCapacityEmptySummary();
    }

    try {
      const content = await fsReadFile(reportPath, "utf8");
      const report = JSON.parse(content);
      return summarizeReport(report, reportPath);
    } catch {
      return buildCapacityEmptySummary("capacity-report-unreadable");
    }
  }

  return {
    getLatestSummary,
  };
}

function buildTriageRecommendations({
  health,
  slo,
  backupValidation,
  rateLimiter,
  recentErrors,
  incidentStatus,
}) {
  const recommendations = [];

  if (health?.status && health.status !== HEALTH_STATUS.HEALTHY) {
    recommendations.push({
      type: "health",
      severity: "high",
      action: "Priorize checks degradados/unhealthy e estabilize DB/model/disk antes de novas mudancas",
    });
  }

  if (slo?.status === "alerta") {
    recommendations.push({
      type: "slo",
      severity: "medium",
      action: "Investigue rotas em alerta no SLO e compare p95/erro com janelas anteriores",
    });
  }

  if (backupValidation?.status && backupValidation.status !== "ok") {
    recommendations.push({
      type: "backup",
      severity: backupValidation.status === "falha" ? "critical" : "medium",
      action: "Execute validacao com passphrase quando necessario e regenere backups invalidos",
    });
  }

  if (Number(rateLimiter?.rejectedTotal || 0) > 0) {
    recommendations.push({
      type: "rate-limiter",
      severity: "medium",
      action: "Analise picos de rejeicao/timeout no rate limiter e ajuste limites por papel se necessario",
    });
  }

  if (Array.isArray(recentErrors) && recentErrors.length >= 5) {
    recommendations.push({
      type: "security",
      severity: "high",
      action: "Volume alto de erros/bloqueios recentes; revisar possivel abuso ou regressao operacional",
    });
  }

  if (incidentStatus?.status && incidentStatus.status !== "normal") {
    recommendations.push({
      type: "manual",
      severity: incidentStatus.severity || "medium",
      action: `Incidente em ${incidentStatus.status}; manter atualizacao em ${incidentStatus.nextUpdateAt || "janela curta"
        } e registrar decisoes no runbook`,
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      type: "manual",
      severity: "info",
      action: "Sem sinais criticos no snapshot atual; manter monitoramento rotineiro",
    });
  }

  return recommendations;
}

function buildOverallHealthStatus(checks = {}) {
  const statuses = Object.values(checks).map((item) => item?.status);
  if (statuses.some((status) => status === HEALTH_STATUS.UNHEALTHY)) {
    return HEALTH_STATUS.UNHEALTHY;
  }
  if (statuses.some((status) => status === HEALTH_STATUS.DEGRADED)) {
    return HEALTH_STATUS.DEGRADED;
  }
  return HEALTH_STATUS.HEALTHY;
}

function buildSloSnapshot(telemetryStats = []) {
  const objectives = {
    availabilityMaxErrorRatePct: 5,
    p95LatencyReadMs: 400,
    p95LatencyWriteMs: 1200,
    minSamples: 5,
  };

  const criticalRoutes = telemetryStats.filter((item) => {
    const key = `${item.method} ${item.path}`;
    return [
      "GET /api/chats",
      "POST /api/chat",
      "POST /api/chat-stream",
      "GET /api/health",
    ].includes(key);
  });

  const evaluations = criticalRoutes.map((route) => {
    const isRead = route.method === "GET";
    const latencyTarget = isRead
      ? objectives.p95LatencyReadMs
      : objectives.p95LatencyWriteMs;
    const hasSamples = route.count >= objectives.minSamples;
    const availabilityOk = hasSamples
      ? (route.errorRate || 0) <= objectives.availabilityMaxErrorRatePct
      : true;
    const latencyOk = hasSamples ? (route.p95Ms || 0) <= latencyTarget : true;
    const status = hasSamples
      ? availabilityOk && latencyOk
        ? "ok"
        : "alerta"
      : "insuficiente";

    return {
      route: `${route.method} ${route.path}`,
      count: route.count || 0,
      errorRate: route.errorRate || 0,
      p95Ms: route.p95Ms || 0,
      target: {
        errorRate: objectives.availabilityMaxErrorRatePct,
        p95Ms: latencyTarget,
      },
      status,
    };
  });

  const considered = evaluations.filter((item) => item.status !== "insuficiente");
  const allOk = considered.length > 0 && considered.every((item) => item.status === "ok");
  const hasAlerts = considered.some((item) => item.status === "alerta");

  return {
    generatedAt: new Date().toISOString(),
    objectives,
    status: allOk ? "ok" : hasAlerts ? "alerta" : "insuficiente",
    evaluatedRoutes: evaluations,
  };
}

function createDefaultHealthProviders({ store, chatClient, dbPath }) {
  return {
    async checkDb() {
      const start = Date.now();
      try {
        await withTimeout(
          store.listChats("user-default", {
            favoriteOnly: false,
            showArchived: false,
            tag: null,
          }),
          4_000,
          "DB nao respondeu no prazo",
        );
        return {
          status: HEALTH_STATUS.HEALTHY,
          latencyMs: Date.now() - start,
        };
      } catch (error) {
        return {
          status: HEALTH_STATUS.UNHEALTHY,
          latencyMs: Date.now() - start,
          error: error.message,
        };
      }
    },

    async checkModel() {
      const start = Date.now();
      try {
        await withTimeout(chatClient.list(), 5_000, "Modelo nao respondeu no prazo");
        return {
          status: HEALTH_STATUS.HEALTHY,
          latencyMs: Date.now() - start,
          ollama: "online",
        };
      } catch (error) {
        return {
          status: HEALTH_STATUS.DEGRADED,
          latencyMs: Date.now() - start,
          ollama: "offline",
          error: error.message,
        };
      }
    },

    async checkDisk() {
      const start = Date.now();
      try {
        const stats = await statfs(path.dirname(dbPath));
        const totalBytes = Number(stats.bsize || 0) * Number(stats.blocks || 0);
        const freeBytes = Number(stats.bsize || 0) * Number(stats.bavail || 0);
        const freePercent = totalBytes > 0 ? Math.round((freeBytes / totalBytes) * 100) : 0;

        let status = HEALTH_STATUS.HEALTHY;
        if (freePercent <= 5) {
          status = HEALTH_STATUS.UNHEALTHY;
        } else if (freePercent <= 15) {
          status = HEALTH_STATUS.DEGRADED;
        }

        return {
          status,
          latencyMs: Date.now() - start,
          totalBytes,
          freeBytes,
          freePercent,
        };
      } catch (error) {
        return {
          status: HEALTH_STATUS.DEGRADED,
          latencyMs: Date.now() - start,
          error: error.message,
        };
      }
    },
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
    createBaselineService({
      baselinePath: path.join(serverDir, "artifacts", "baseline", "config-baseline.json"),
      getConfig: () => ({
        telemetryEnabled: isTelemetryEnabled(),
        queue: {
          maxConcurrency: parsePositiveInt(process.env.QUEUE_MAX_CONCURRENCY, 4, 1, 32),
          maxSize: parsePositiveInt(process.env.QUEUE_MAX_SIZE, 100, 1, 500),
          taskTimeoutMs: parsePositiveInt(process.env.QUEUE_TASK_TIMEOUT_MS, 30000, 5000, 120000),
          rejectPolicy: (process.env.QUEUE_REJECT_POLICY || "reject").trim(),
        },
        autoHealing: {
          enabled: autoHealingService.getStatus().enabled,
          cooldownMs: autoHealingService.getStatus().cooldownMs,
          maxAttempts: autoHealingService.getStatus().maxAttempts,
        },
      }),
    });
  const approvalService =
    deps.approvalService ||
    createOperationalApprovalService({
      approvalsPath: path.join(
        serverDir,
        "artifacts",
        "approvals",
        "operational-approvals.json",
      ),
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

  async function collectIncidentRunbookSignals({ backupPassphrase = null } = {}) {
    const [healthDb, healthModel, healthDisk, auditPage] = await Promise.all([
      healthProviders.checkDb(),
      healthProviders.checkModel(),
      healthProviders.checkDisk(),
      store.listAuditLogs({ page: 1, limit: 50 }),
    ]);

    const telemetryStats = getTelemetryStats().map((item) => ({
      ...item,
      errorRate: item.count ? Math.round((item.errors / item.count) * 100) : 0,
    }));

    const backupValidation = await backupService
      .validateRecentBackups({ limit: 3, passphrase: backupPassphrase })
      .catch((error) => ({
        checkedAt: new Date().toISOString(),
        limit: 3,
        status: "falha",
        items: [],
        error: String(error?.message || "Falha ao validar backups"),
      }));

    const rateLimiter = roleLimiter.getMetrics();
    const recentErrors = auditPage.items
      .filter(
        (entry) =>
          typeof entry.eventType === "string" &&
          (entry.eventType.includes("blocked") || entry.eventType.includes("error")),
      )
      .slice(0, 20);

    const health = {
      status: buildOverallHealthStatus({ db: healthDb, model: healthModel, disk: healthDisk }),
      checks: { db: healthDb, model: healthModel, disk: healthDisk },
    };
    const slo = buildSloSnapshot(telemetryStats);
    const incidentStatus = incidentService.getStatus();
    const recommendations = buildTriageRecommendations({
      health,
      slo,
      backupValidation,
      rateLimiter,
      recentErrors,
      incidentStatus,
    });

    return {
      health,
      slo,
      backupValidation,
      rateLimiter,
      recentErrors,
      incidentStatus,
      recommendations,
    };
  }

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

  async function readCurrentConfigValue(version) {
    switch (version.configKey) {
      case CONFIG_KEYS.CHAT_SYSTEM_PROMPT: {
        const promptContext = await store.getChatSystemPrompts(version.targetId);
        if (!promptContext) throw new HttpError(404, "Chat nao encontrado");
        return promptContext.systemPrompt || "";
      }
      case CONFIG_KEYS.USER_DEFAULT_SYSTEM_PROMPT: {
        const user = await store.getUserById(version.targetId);
        if (!user) throw new HttpError(404, "Perfil nao encontrado");
        return user.defaultSystemPrompt || "";
      }
      case CONFIG_KEYS.USER_THEME: {
        const user = await store.getUserById(version.targetId);
        if (!user) throw new HttpError(404, "Perfil nao encontrado");
        return user.theme || "system";
      }
      case CONFIG_KEYS.USER_STORAGE_LIMIT_MB: {
        const user = await store.getUserById(version.targetId);
        if (!user) throw new HttpError(404, "Perfil nao encontrado");
        return Number.parseInt(user.storageLimitMb, 10) || 512;
      }
      case CONFIG_KEYS.APP_TELEMETRY_ENABLED:
        return !!isTelemetryEnabled();
      default:
        throw new HttpError(400, "configKey nao suportada para rollback");
    }
  }

  async function applyConfigValue(version) {
    switch (version.configKey) {
      case CONFIG_KEYS.CHAT_SYSTEM_PROMPT: {
        const value = parseSystemPrompt(version.value);
        const updated = await store.setChatSystemPrompt(version.targetId, value);
        if (!updated) throw new HttpError(404, "Chat nao encontrado");
        return updated;
      }
      case CONFIG_KEYS.USER_DEFAULT_SYSTEM_PROMPT: {
        const value = parseSystemPrompt(version.value);
        const updated = await store.setUserDefaultSystemPrompt(version.targetId, value);
        if (!updated) throw new HttpError(404, "Perfil nao encontrado");
        return updated;
      }
      case CONFIG_KEYS.USER_THEME: {
        const value = parseTheme(version.value);
        const updated = await store.setUserTheme(version.targetId, value);
        if (!updated) throw new HttpError(404, "Perfil nao encontrado");
        return updated;
      }
      case CONFIG_KEYS.USER_STORAGE_LIMIT_MB: {
        const value = parseStorageLimitMb(version.value);
        const updated = await store.setUserStorageLimit(version.targetId, value);
        if (!updated) throw new HttpError(404, "Perfil nao encontrado");
        return updated;
      }
      case CONFIG_KEYS.APP_TELEMETRY_ENABLED: {
        const value = parseBooleanLike(version.value, false);
        setTelemetryEnabled(value);
        if (!value) {
          resetTelemetryStats();
        }
        return { enabled: isTelemetryEnabled() };
      }
      default:
        throw new HttpError(400, "configKey nao suportada para rollback");
    }
  }

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
