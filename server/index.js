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

const CHAT_ID_REGEX = /^[a-zA-Z0-9:_-]{1,80}$/;
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_IMAGES = 4;
const MAX_IMAGE_BASE64_LENGTH = 2_500_000;
const MAX_IMAGES_TOTAL_BASE64_LENGTH = 6_000_000;
const MAX_RAG_DOCS_PER_UPLOAD = 6;
const MAX_RAG_DOC_NAME_LENGTH = 140;
const MAX_RAG_DOC_CONTENT_LENGTH = 120_000;
const MAX_IMPORT_MESSAGES = 2000;
const MAX_BACKUP_IMPORT_BYTES = 25 * 1024 * 1024;
const MAX_BACKUP_PASSPHRASE_LENGTH = 128;
const MIN_BACKUP_PASSPHRASE_LENGTH = 8;
const MAX_APPROVAL_REASON_LENGTH = 280;
const MAX_USER_NAME_LENGTH = 40;
const MAX_SYSTEM_PROMPT_LENGTH = 2500;
const USER_ROLES = ["admin", "operator", "viewer"];
const ROLE_LEVEL = {
  viewer: 1,
  operator: 2,
  admin: 3,
};
const INCIDENT_STATUSES = [
  "normal",
  "investigating",
  "mitigating",
  "monitoring",
  "resolved",
];
const INCIDENT_SEVERITIES = ["info", "low", "medium", "high", "critical"];
const INCIDENT_STATUS_TRANSITIONS = {
  normal: new Set(["investigating"]),
  investigating: new Set(["mitigating", "monitoring", "resolved"]),
  mitigating: new Set(["investigating", "monitoring", "resolved"]),
  monitoring: new Set(["normal", "investigating", "resolved"]),
  resolved: new Set(["normal", "monitoring", "investigating"]),
};
const INCIDENT_RUNBOOK_TYPES = {
  "model-offline": {
    severity: "high",
    recommendationType: "health",
    triageSummary: "Modelo principal indisponivel; triagem iniciada via runbook",
    mitigationSummary: "Mitigacao aplicada para modelo indisponivel (fallback/retry)",
  },
  "db-degraded": {
    severity: "critical",
    recommendationType: "health",
    triageSummary: "Banco degradado; triagem iniciada via runbook",
    mitigationSummary: "Mitigacao aplicada para degradacao de banco",
  },
  "disk-pressure": {
    severity: "high",
    recommendationType: "security",
    triageSummary: "Pressao de disco detectada; triagem iniciada via runbook",
    mitigationSummary: "Mitigacao aplicada para pressao de disco",
  },
  "backup-alert": {
    severity: "medium",
    recommendationType: "backup",
    triageSummary: "Alerta de backup detectado; triagem iniciada via runbook",
    mitigationSummary: "Mitigacao aplicada para alerta de backup",
  },
};
const AUTO_HEALING_POLICIES = ["model-offline", "db-lock"];
const OPERATIONAL_APPROVAL_ACTIONS = [
  "backup.restore",
  "disaster-recovery.test",
  "incident.runbook.execute",
  "storage.cleanup.execute",
];
const CONFIG_KEYS = {
  CHAT_SYSTEM_PROMPT: "chat.systemPrompt",
  USER_DEFAULT_SYSTEM_PROMPT: "user.defaultSystemPrompt",
  USER_THEME: "user.theme",
  USER_STORAGE_LIMIT_MB: "user.storageLimitMb",
  APP_TELEMETRY_ENABLED: "app.telemetryEnabled",
};
const ALLOWED_CONFIG_KEYS = new Set(Object.values(CONFIG_KEYS));

const HEALTH_STATUS = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  UNHEALTHY: "unhealthy",
};
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertBodyObject(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "Body invalido: esperado JSON objeto");
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseChatId(raw, fieldName = "chatId") {
  const value = String(raw || "").trim();
  if (!value) {
    throw new HttpError(400, `${fieldName} obrigatorio`);
  }
  if (!CHAT_ID_REGEX.test(value)) {
    throw new HttpError(400, `${fieldName} invalido`);
  }
  return value;
}

function getChatId(body = {}) {
  const raw = body.chatId ?? "default";
  return parseChatId(raw, "chatId");
}

function parseUserId(raw, fallback = "user-default") {
  const value = String(raw ?? fallback).trim() || fallback;
  if (!CHAT_ID_REGEX.test(value)) {
    throw new HttpError(400, "userId invalido");
  }
  return value;
}

function parseUserName(raw) {
  const name = String(raw ?? "").trim();
  if (!name) {
    throw new HttpError(400, "Nome do perfil obrigatorio");
  }
  if (name.length > MAX_USER_NAME_LENGTH) {
    throw new HttpError(400, `Nome muito longo (max ${MAX_USER_NAME_LENGTH})`);
  }
  return name;
}

function parseUserRole(raw, fallback = "operator") {
  const role = String(raw ?? fallback)
    .trim()
    .toLowerCase();
  if (!USER_ROLES.includes(role)) {
    throw new HttpError(400, "role invalida: use admin, operator ou viewer");
  }
  return role;
}

function normalizeRole(role, fallback = "viewer") {
  const safeRole = String(role || "").trim().toLowerCase();
  return USER_ROLES.includes(safeRole) ? safeRole : fallback;
}

function hasRequiredRole(userRole, minimumRole) {
  const current = ROLE_LEVEL[normalizeRole(userRole, "viewer")] || 0;
  const minimum = ROLE_LEVEL[normalizeRole(minimumRole, "viewer")] || 0;
  return current >= minimum;
}

function parseTitle(raw, fallback = "Nova conversa") {
  const title = String(raw ?? fallback).trim();
  if (!title) {
    throw new HttpError(400, "Titulo obrigatorio");
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new HttpError(400, `Titulo muito longo (max ${MAX_TITLE_LENGTH})`);
  }
  return title;
}

function parseMessage(body = {}) {
  const message = String(body.message ?? "").trim();
  if (!message) {
    throw new HttpError(400, "Mensagem obrigatoria");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(
      400,
      `Mensagem muito longa (max ${MAX_MESSAGE_LENGTH})`,
    );
  }
  return message;
}

function getMessageImages(body = {}) {
  if (body.images === undefined) return [];
  if (!Array.isArray(body.images)) {
    throw new HttpError(400, "images deve ser uma lista");
  }

  if (body.images.length > MAX_IMAGES) {
    throw new HttpError(400, `maximo de ${MAX_IMAGES} imagens por mensagem`);
  }

  const images = body.images
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);

  let totalLength = 0;

  for (const image of images) {
    if (image.length > MAX_IMAGE_BASE64_LENGTH) {
      throw new HttpError(400, "Imagem muito grande");
    }

    totalLength += image.length;
    if (totalLength > MAX_IMAGES_TOTAL_BASE64_LENGTH) {
      throw new HttpError(400, "Payload de imagens excede o limite permitido");
    }

    if (image.startsWith("data:")) {
      const mimeMatch = image.match(/^data:([^;,]+);base64,/i);
      if (!mimeMatch) {
        throw new HttpError(400, "Imagem invalida");
      }
      const mimeType = mimeMatch[1].toLowerCase();
      if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
        throw new HttpError(400, "Tipo de imagem nao permitido");
      }
      const encoded = image.slice(image.indexOf(",") + 1).trim();
      if (!encoded || !/^[A-Za-z0-9+/=\r\n]+$/.test(encoded)) {
        throw new HttpError(400, "Imagem invalida");
      }
      continue;
    }

    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(image)) {
      throw new HttpError(400, "Imagem invalida");
    }
  }

  return images;
}

function parseUserOnly(raw) {
  return raw === true || raw === "true";
}

function parseBooleanLike(raw, fallback = false) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  if (raw === true || raw === "true" || raw === "1" || raw === 1) return true;
  if (raw === false || raw === "false" || raw === "0" || raw === 0)
    return false;
  throw new HttpError(400, "Valor booleano invalido");
}

function parseTags(raw) {
  if (!Array.isArray(raw)) {
    throw new HttpError(400, "tags deve ser uma lista");
  }
  const tags = raw
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .map((tag) => tag.slice(0, 30));
  return [...new Set(tags)].slice(0, 10);
}

function parseSystemPrompt(raw) {
  const prompt = String(raw ?? "").trim();
  if (prompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
    throw new HttpError(
      400,
      `System prompt muito longo (max ${MAX_SYSTEM_PROMPT_LENGTH})`,
    );
  }
  return prompt;
}

function parseTheme(raw) {
  const theme = String(raw ?? "").trim().toLowerCase();
  if (!["light", "dark", "system"].includes(theme)) {
    throw new HttpError(400, "Tema invalido: use light, dark ou system");
  }
  return theme;
}

function parseUiPreferences(body = {}) {
  const prefs = {};
  if (body.theme !== undefined) {
    prefs.theme = parseTheme(body.theme);
  }
  const ALLOWED_KEYS = new Set(["theme"]);
  const unknown = Object.keys(body).filter((k) => !ALLOWED_KEYS.has(k));
  if (unknown.length) {
    throw new HttpError(400, `Preferencias desconhecidas: ${unknown.join(", ")}`);
  }
  if (!Object.keys(prefs).length) {
    throw new HttpError(400, "Nenhuma preferencia valida informada");
  }
  return prefs;
}

function parseStorageLimitMb(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 50 || parsed > 10240) {
    throw new HttpError(400, "storageLimitMb invalido (use entre 50 e 10240)");
  }
  return parsed;
}

function parseCleanupMode(raw) {
  const mode = String(raw || "dry-run").trim().toLowerCase();
  if (!["dry-run", "execute"].includes(mode)) {
    throw new HttpError(400, "mode invalido: use dry-run ou execute");
  }
  return mode;
}

function parseCleanupTarget(raw) {
  const target = String(raw || "all").trim().toLowerCase();
  if (!["all", "uploads", "documents", "backups"].includes(target)) {
    throw new HttpError(
      400,
      "target invalido: use all, uploads, documents ou backups",
    );
  }
  return target;
}

function parseCleanupOlderThanDays(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 3650) {
    throw new HttpError(400, "olderThanDays invalido (use entre 0 e 3650)");
  }
  return parsed;
}

function parseCleanupMaxDeleteMb(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 102400) {
    throw new HttpError(400, "maxDeleteMb invalido (use entre 1 e 102400)");
  }
  return parsed;
}

function parseCleanupPreserveValidatedBackups(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 20) {
    throw new HttpError(400, "preserveValidatedBackups invalido (use entre 0 e 20)");
  }
  return parsed;
}

function parseOperationalApprovalAction(raw) {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!OPERATIONAL_APPROVAL_ACTIONS.includes(value)) {
    throw new HttpError(
      400,
      `action invalida: use ${OPERATIONAL_APPROVAL_ACTIONS.join(", ")}`,
    );
  }
  return value;
}

function parseOperationalApprovalReason(raw, { required = true } = {}) {
  const value = String(raw ?? "").trim();
  if (!value && required) {
    throw new HttpError(400, "reason obrigatorio");
  }
  if (value.length > MAX_APPROVAL_REASON_LENGTH) {
    throw new HttpError(
      400,
      `reason muito longo (max ${MAX_APPROVAL_REASON_LENGTH})`,
    );
  }
  return value || null;
}

function parseOperationalApprovalWindowMinutes(raw, fallback = 30) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1440) {
    throw new HttpError(400, "windowMinutes invalido (use entre 1 e 1440)");
  }
  return parsed;
}

function parseOperationalApprovalId(raw, fieldName = "approvalId") {
  return parseChatId(raw, fieldName);
}

function parseOperationalApprovalDecision(raw) {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!["approve", "deny"].includes(value)) {
    throw new HttpError(400, "decision invalida: use approve ou deny");
  }
  return value;
}

function parseOperationalApprovalStatus(raw) {
  const value = String(raw ?? "all")
    .trim()
    .toLowerCase();
  const allowed = ["all", "pending", "approved", "denied", "expired", "consumed"];
  if (!allowed.includes(value)) {
    throw new HttpError(400, `status invalido: use ${allowed.join(", ")}`);
  }
  return value;
}

function parseIncidentStatus(raw, fallback = "normal") {
  const status = String(raw ?? fallback)
    .trim()
    .toLowerCase();
  if (!INCIDENT_STATUSES.includes(status)) {
    throw new HttpError(
      400,
      `incident.status invalido: use ${INCIDENT_STATUSES.join(", ")}`,
    );
  }
  return status;
}

function parseIncidentSeverity(raw, fallback = "info") {
  const severity = String(raw ?? fallback)
    .trim()
    .toLowerCase();
  if (!INCIDENT_SEVERITIES.includes(severity)) {
    throw new HttpError(
      400,
      `incident.severity invalido: use ${INCIDENT_SEVERITIES.join(", ")}`,
    );
  }
  return severity;
}

function parseIncidentSummary(raw, { required = false } = {}) {
  const summary = String(raw ?? "").trim();
  if (!summary && required) {
    throw new HttpError(400, "incident.summary obrigatorio");
  }
  if (summary.length > 280) {
    throw new HttpError(400, "incident.summary muito longo (max 280)");
  }
  return summary || null;
}

function parseIncidentOwner(raw) {
  const owner = String(raw ?? "").trim();
  if (!owner) return null;
  if (owner.length > 80) {
    throw new HttpError(400, "incident.owner muito longo (max 80)");
  }
  return owner;
}

function parseIncidentRecommendationType(raw) {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return null;
  const allowed = ["health", "slo", "backup", "rate-limiter", "security", "manual"];
  if (!allowed.includes(value)) {
    throw new HttpError(400, "incident.recommendationType invalido");
  }
  return value;
}

function parseIncidentNextUpdateAt(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  return parseSearchDate(raw, "incident.nextUpdateAt");
}

function parseIncidentRunbookType(raw) {
  const type = String(raw || "")
    .trim()
    .toLowerCase();
  if (!type || !Object.prototype.hasOwnProperty.call(INCIDENT_RUNBOOK_TYPES, type)) {
    throw new HttpError(
      400,
      `incident.runbookType invalido: use ${Object.keys(INCIDENT_RUNBOOK_TYPES).join(", ")}`,
    );
  }
  return type;
}

function parseIncidentRunbookMode(raw) {
  const mode = String(raw || "execute")
    .trim()
    .toLowerCase();
  if (!["dry-run", "execute", "rollback"].includes(mode)) {
    throw new HttpError(400, "incident.mode invalido: use dry-run, execute ou rollback");
  }
  return mode;
}

function parseDisasterScenarioId(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = String(raw).trim().toLowerCase();
  if (!/^[a-z0-9:_-]{3,80}$/.test(value)) {
    throw new HttpError(400, "scenarioId invalido");
  }
  return value;
}

function parseIntegrityManifest(content = "") {
  const lines = String(content || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = [];
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
    if (!match) continue;
    const hash = String(match[1] || "").toLowerCase();
    const file = String(match[2] || "").trim();
    if (!file) continue;
    entries.push({ hash, file });
  }
  return entries;
}

function parseAutoHealingPolicy(raw) {
  const policy = String(raw || "")
    .trim()
    .toLowerCase();
  if (!AUTO_HEALING_POLICIES.includes(policy)) {
    throw new HttpError(
      400,
      `autoHealing.policy invalida: use ${AUTO_HEALING_POLICIES.join(", ")}`,
    );
  }
  return policy;
}

function parseAutoHealingCooldownMs(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0 || value > 3_600_000) {
    throw new HttpError(400, "autoHealing.cooldownMs invalido (use entre 0 e 3600000)");
  }
  return value;
}

function parseAutoHealingMaxAttempts(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1 || value > 20) {
    throw new HttpError(400, "autoHealing.maxAttempts invalido (use entre 1 e 20)");
  }
  return value;
}

function parseAutoHealingWindowMs(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1_000 || value > 86_400_000) {
    throw new HttpError(400, "autoHealing.windowMs invalido (use entre 1000 e 86400000)");
  }
  return value;
}

function parseAutoHealingConfigPatch(body = {}) {
  const has = (field) => Object.prototype.hasOwnProperty.call(body, field);
  const patch = {};

  if (has("enabled")) {
    patch.enabled = parseBooleanLike(body.enabled);
  }
  if (has("cooldownMs")) {
    patch.cooldownMs = parseAutoHealingCooldownMs(body.cooldownMs);
  }
  if (has("maxAttempts")) {
    patch.maxAttempts = parseAutoHealingMaxAttempts(body.maxAttempts);
  }
  if (has("windowMs")) {
    patch.windowMs = parseAutoHealingWindowMs(body.windowMs);
  }
  if (has("resetCircuit")) {
    patch.resetCircuit = parseBooleanLike(body.resetCircuit);
  }

  if (!Object.keys(patch).length) {
    throw new HttpError(400, "Body invalido: informe ao menos um campo de auto-healing");
  }

  return patch;
}

function parseIncidentUpdatePayload(body = {}) {
  const has = (field) => Object.prototype.hasOwnProperty.call(body, field);
  const patch = {};

  if (has("status")) patch.status = parseIncidentStatus(body.status);
  if (has("severity")) patch.severity = parseIncidentSeverity(body.severity);
  if (has("summary")) patch.summary = parseIncidentSummary(body.summary);
  if (has("owner")) patch.owner = parseIncidentOwner(body.owner);
  if (has("nextUpdateAt")) {
    patch.nextUpdateAt = parseIncidentNextUpdateAt(body.nextUpdateAt);
  }
  if (has("recommendationType")) {
    patch.recommendationType = parseIncidentRecommendationType(
      body.recommendationType,
    );
  }

  if (!Object.keys(patch).length) {
    throw new HttpError(400, "Body invalido: informe ao menos um campo de incidente");
  }

  return patch;
}

function parseAuditFilters(query = {}) {
  const eventType = String(query.eventType || "").trim();
  const userId = query.userId ? parseUserId(query.userId) : null;
  const from = parseSearchDate(query.from, "from");
  const to = parseSearchDate(query.to, "to");
  const page = parseSearchPage(query.page);
  const limit = parseSearchLimit(query.limit);
  if (from && to && new Date(from) > new Date(to)) {
    throw new HttpError(400, "Parametro from nao pode ser maior que to");
  }
  return {
    eventType: eventType || null,
    userId,
    from,
    to,
    page,
    limit,
  };
}

function parseConfigKey(raw) {
  const key = String(raw || "").trim();
  if (!key) return null;
  if (!ALLOWED_CONFIG_KEYS.has(key)) {
    throw new HttpError(400, "configKey invalida");
  }
  return key;
}

function parseConfigTargetType(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return null;
  if (!["chat", "user", "app"].includes(value)) {
    throw new HttpError(400, "targetType invalido");
  }
  return value;
}

function parseConfigVersionId(raw) {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id < 1) {
    throw new HttpError(400, "versionId invalido");
  }
  return id;
}

function parseConfigVersionFilters(query = {}) {
  const configKey = parseConfigKey(query.configKey);
  const targetType = parseConfigTargetType(query.targetType);
  const targetId = query.targetId ? parseUserId(query.targetId) : null;
  const page = parseSearchPage(query.page);
  const limit = parseSearchLimit(query.limit);
  return {
    configKey,
    targetType,
    targetId,
    page,
    limit,
  };
}

function areConfigValuesEqual(left, right) {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return String(left) === String(right);
  }
}

function parseChatListFilters(query = {}) {
  const favoriteOnly = parseBooleanLike(query.favorite, false);
  const showArchived = parseBooleanLike(query.archived, false);
  const tag = String(query.tag || "").trim();
  const search = String(query.search || "").trim();
  const page = parseSearchPage(query.page);
  const rawLimit = query.limit;
  const limit = rawLimit === undefined ? 20 : parseSearchLimit(rawLimit);
  return {
    favoriteOnly,
    showArchived,
    tag: tag || null,
    search: search || null,
    page,
    limit,
  };
}

function parseSearchQuery(raw) {
  const query = String(raw ?? "").trim();
  if (!query) {
    throw new HttpError(400, "Parametro q obrigatorio");
  }
  if (query.length < 2) {
    throw new HttpError(400, "Parametro q deve ter pelo menos 2 caracteres");
  }
  if (query.length > 120) {
    throw new HttpError(400, "Parametro q muito longo (max 120)");
  }
  return query;
}

function parseSearchPage(raw) {
  if (raw === undefined) return 1;
  const page = Number.parseInt(raw, 10);
  if (!Number.isFinite(page) || page < 1) {
    throw new HttpError(400, "Parametro page invalido");
  }
  return page;
}

function parseSearchLimit(raw) {
  if (raw === undefined) return 20;
  const limit = Number.parseInt(raw, 10);
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    throw new HttpError(400, "Parametro limit invalido");
  }
  return limit;
}

function parseSearchRole(raw) {
  const role = String(raw || "all")
    .trim()
    .toLowerCase();
  if (!["all", "user", "assistant"].includes(role)) {
    throw new HttpError(400, "Parametro role invalido");
  }
  return role;
}

function parseSearchDate(raw, fieldName) {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = String(raw).trim();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, `Parametro ${fieldName} invalido`);
  }
  return parsed.toISOString();
}

function parseOptions(body = {}) {
  const temperature = Number.parseFloat(body.temperature);
  const context = Number.parseInt(body.context, 10);
  const safeTemperature = Number.isFinite(temperature)
    ? clamp(temperature, 0, 2)
    : 0.7;
  const safeContext = Number.isFinite(context)
    ? clamp(context, 256, 8192)
    : 2048;
  const model = String(body.model || "meu-llama3").trim() || "meu-llama3";

  return {
    model,
    temperature: safeTemperature,
    num_ctx: safeContext,
  };
}

function parseRagOptions(body = {}) {
  const enabled =
    body.ragEnabled === true ||
    body.ragEnabled === "true" ||
    body.rag === true ||
    body.rag === "true";

  const topK = clamp(Number.parseInt(body.ragTopK, 10) || 3, 1, 8);

  return {
    enabled,
    topK,
  };
}

function parseRagDocuments(body = {}) {
  if (!Array.isArray(body.documents)) {
    throw new HttpError(400, "documents deve ser uma lista");
  }

  if (body.documents.length > MAX_RAG_DOCS_PER_UPLOAD) {
    throw new HttpError(
      400,
      `Quantidade de documentos excede o limite (${MAX_RAG_DOCS_PER_UPLOAD})`,
    );
  }

  const docs = body.documents.map((item) => {
    if (!isPlainObject(item)) {
      throw new HttpError(400, "Documento invalido");
    }

    const name = String(item.name || "").trim();
    const content = String(item.content || "").trim();

    if (!name) {
      throw new HttpError(400, "Nome do documento obrigatorio");
    }
    if (name.length > MAX_RAG_DOC_NAME_LENGTH) {
      throw new HttpError(400, "Nome do documento muito longo");
    }
    if (name.includes("/") || name.includes("\\")) {
      throw new HttpError(400, "Nome do documento invalido");
    }
    if ([...name].some((char) => char.charCodeAt(0) < 32)) {
      throw new HttpError(400, "Nome do documento contem caracteres invalidos");
    }
    if (!content) {
      throw new HttpError(400, "Conteudo do documento obrigatorio");
    }
    if (content.length > MAX_RAG_DOC_CONTENT_LENGTH) {
      throw new HttpError(400, "Documento muito grande para indexacao local");
    }

    return { name, content };
  });

  if (!docs.length) {
    throw new HttpError(400, "Nenhum documento enviado");
  }

  return docs;
}

function buildRagSystemMessage(chunks = []) {
  if (!chunks.length) return null;

  const context = chunks
    .map(
      (item) =>
        `[Fonte: ${item.documentName}#trecho${item.chunkIndex}]\n${item.content}`,
    )
    .join("\n\n");

  return [
    "Voce recebeu contexto de documentos locais.",
    "Responda com base nesse contexto quando relevante.",
    "Ao usar um trecho, cite no formato [Fonte: arquivo#trechoN].",
    "Se o contexto nao cobrir a pergunta, diga explicitamente que nao encontrou base documental suficiente.",
    "",
    context,
  ].join("\n");
}

function buildSystemMessages({
  defaultSystemPrompt = "",
  chatSystemPrompt = "",
  ragSystemMessage = "",
}) {
  const messages = [];
  const defaultPrompt = String(defaultSystemPrompt || "").trim();
  const chatPrompt = String(chatSystemPrompt || "").trim();
  const ragPrompt = String(ragSystemMessage || "").trim();

  if (defaultPrompt) messages.push({ role: "system", content: defaultPrompt });
  if (chatPrompt) messages.push({ role: "system", content: chatPrompt });
  if (ragPrompt) messages.push({ role: "system", content: ragPrompt });
  return messages;
}

function parsePositiveInt(
  raw,
  fallback,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function withTimeout(promise, timeoutMs, errorMessage) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new HttpError(504, errorMessage));
      }, timeoutMs);
    }),
  ]);
}

function buildModelAttemptPlan(primaryModel, fallbackModel, maxAttempts) {
  const primary = String(primaryModel || "").trim();
  const fallback = String(fallbackModel || "").trim();
  const attempts = [];

  if (primary) attempts.push(primary);
  if (fallback && fallback !== primary) attempts.push(fallback);

  if (!attempts.length) attempts.push("meu-llama3");

  while (attempts.length < maxAttempts) {
    attempts.push(attempts[attempts.length - 1]);
  }

  return attempts.slice(0, maxAttempts);
}

const DEFAULT_RETRY_DELAYS_MS = [500, 1000, 2000];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeWithModelRecovery({
  primaryModel,
  fallbackModel,
  maxAttempts,
  timeoutMs,
  retryDelays = DEFAULT_RETRY_DELAYS_MS,
  logger,
  run,
}) {
  const attemptPlan = buildModelAttemptPlan(
    primaryModel,
    fallbackModel,
    maxAttempts,
  );
  let lastError;

  for (let idx = 0; idx < attemptPlan.length; idx += 1) {
    const model = attemptPlan[idx];
    try {
      const result = await withTimeout(
        run(model),
        timeoutMs,
        `Tempo limite excedido ao consultar o modelo ${model}`,
      );

      return { result, modelUsed: model, attempt: idx + 1 };
    } catch (err) {
      lastError = err;
      logger?.warn(
        {
          model,
          attempt: idx + 1,
          maxAttempts: attemptPlan.length,
          error: err.message,
        },
        "Tentativa de inferencia falhou",
      );

      if (idx < attemptPlan.length - 1) {
        const delayMs =
          retryDelays[idx] ?? retryDelays[retryDelays.length - 1] ?? 1000;
        if (delayMs > 0) await sleep(delayMs);
      }
    }
  }

  throw (
    lastError || new HttpError(502, "Falha ao consultar modelos de inferencia")
  );
}

function parseOriginList(raw) {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseDirList(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseChatImportPayload(rawBody = {}) {
  assertBodyObject(rawBody);

  const chat = rawBody.chat;
  if (!isPlainObject(chat)) {
    throw new HttpError(400, "Payload invalido: campo chat obrigatorio");
  }

  const sanitized = {
    chat: {
      id: chat.id ? parseChatId(chat.id, "chat.id") : undefined,
      title: parseTitle(chat.title, "Conversa importada"),
      userId: parseUserId(chat.userId, "user-default"),
      isFavorite: parseBooleanLike(chat.isFavorite, false),
      archivedAt: null,
      systemPrompt: parseSystemPrompt(chat.systemPrompt || ""),
      tags: Array.isArray(chat.tags) ? parseTags(chat.tags) : [],
      messages: [],
    },
  };

  if (chat.archivedAt !== undefined && chat.archivedAt !== null && chat.archivedAt !== "") {
    sanitized.chat.archivedAt = parseSearchDate(chat.archivedAt, "chat.archivedAt");
  }

  if (!Array.isArray(chat.messages)) {
    throw new HttpError(400, "Payload invalido: chat.messages deve ser uma lista");
  }

  if (chat.messages.length > MAX_IMPORT_MESSAGES) {
    throw new HttpError(
      400,
      `Quantidade de mensagens excede o limite (${MAX_IMPORT_MESSAGES})`,
    );
  }

  for (const item of chat.messages) {
    if (!isPlainObject(item)) {
      throw new HttpError(400, "Mensagem de importacao invalida");
    }

    const role = String(item.role || "").trim().toLowerCase();
    if (!role || !["user", "assistant"].includes(role)) {
      throw new HttpError(400, "Mensagem de importacao invalida: role deve ser user ou assistant");
    }

    const content = String(item.content || "").trim();
    if (!content) {
      throw new HttpError(400, "Mensagem de importacao invalida: content obrigatorio");
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new HttpError(
        400,
        `Mensagem de importacao muito longa (max ${MAX_MESSAGE_LENGTH})`,
      );
    }

    let images = [];
    if (item.images !== undefined && item.images !== null) {
      if (!Array.isArray(item.images)) {
        throw new HttpError(400, "Mensagem de importacao invalida: images deve ser lista");
      }
      if (item.images.length > MAX_IMAGES) {
        throw new HttpError(
          400,
          `Mensagem de importacao invalida: maximo de ${MAX_IMAGES} imagens`,
        );
      }
      images = item.images.map((image) => String(image || "").trim()).filter(Boolean);
      for (const image of images) {
        if (image.length > MAX_IMAGE_BASE64_LENGTH) {
          throw new HttpError(400, "Mensagem de importacao invalida: imagem muito grande");
        }
      }
    }

    const createdAt =
      item.createdAt === undefined || item.createdAt === null || item.createdAt === ""
        ? new Date().toISOString()
        : parseSearchDate(item.createdAt, "message.createdAt");

    sanitized.chat.messages.push({
      role,
      content,
      images,
      createdAt,
    });
  }

  return sanitized;
}

function parseBackupPayload(raw) {
  const value = String(raw ?? "").trim();
  if (!value) {
    throw new HttpError(400, "archiveBase64 obrigatorio");
  }
  const normalized = value.includes(",") ? value.split(",").pop() : value;
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(normalized)) {
    throw new HttpError(400, "Arquivo de backup invalido");
  }
  const estimatedBytes = Math.floor((normalized.replace(/\s+/g, "").length * 3) / 4);
  if (estimatedBytes > MAX_BACKUP_IMPORT_BYTES) {
    throw new HttpError(
      400,
      `Arquivo de backup excede limite de ${Math.floor(MAX_BACKUP_IMPORT_BYTES / (1024 * 1024))}MB`,
    );
  }
  try {
    const buffer = Buffer.from(normalized, "base64");
    if (!buffer.length) {
      throw new Error("arquivo vazio");
    }
    return buffer;
  } catch {
    throw new HttpError(400, "Arquivo de backup invalido");
  }
}

function parseBackupPassphrase(raw, { required = false } = {}) {
  const value = String(raw ?? "").trim();
  if (!value) {
    if (required) {
      throw new HttpError(400, "passphrase obrigatoria para este backup");
    }
    return null;
  }

  if (value.length < MIN_BACKUP_PASSPHRASE_LENGTH) {
    throw new HttpError(
      400,
      `passphrase deve ter ao menos ${MIN_BACKUP_PASSPHRASE_LENGTH} caracteres`,
    );
  }

  if (value.length > MAX_BACKUP_PASSPHRASE_LENGTH) {
    throw new HttpError(
      400,
      `passphrase muito longa (max ${MAX_BACKUP_PASSPHRASE_LENGTH})`,
    );
  }

  return value;
}

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
