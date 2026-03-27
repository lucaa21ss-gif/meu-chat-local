import { HttpError } from "../kernel/errors/HttpError.js";
import {
  AUTO_HEALING_POLICIES,
  CONFIG_KEYS,
  INCIDENT_RUNBOOK_TYPES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  OPERATIONAL_APPROVAL_ACTIONS,
  ROLE_LEVEL,
  USER_ROLES,
} from "./app-constants.js";

const CHAT_ID_REGEX = /^[a-zA-Z0-9:_-]{1,80}$/;
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_IMAGES = 4;
const MAX_IMAGE_BASE64_LENGTH = 2_500_000;
const MAX_IMAGES_TOTAL_BASE64_LENGTH = 6_000_000;
const MAX_RAG_DOCS_PER_UPLOAD = 6;
const MAX_RAG_DOC_NAME_LENGTH = 140;
const MAX_RAG_DOC_CONTENT_LENGTH = 120_000;
const MAX_BACKUP_PASSPHRASE_LENGTH = 128;
const MIN_BACKUP_PASSPHRASE_LENGTH = 8;
const MAX_APPROVAL_REASON_LENGTH = 280;
const MAX_USER_NAME_LENGTH = 40;
const MAX_SYSTEM_PROMPT_LENGTH = 2500;
const ALLOWED_CONFIG_KEYS = new Set(Object.values(CONFIG_KEYS));
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

export function assertBodyObject(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "Body invalido: esperado JSON objeto");
  }
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function parseChatId(raw, fieldName = "chatId") {
  const value = String(raw || "").trim();
  if (!value) {
    throw new HttpError(400, `${fieldName} obrigatorio`);
  }
  if (!CHAT_ID_REGEX.test(value)) {
    throw new HttpError(400, `${fieldName} invalido`);
  }
  return value;
}

export function getChatId(body = {}) {
  const raw = body.chatId ?? "default";
  return parseChatId(raw, "chatId");
}

export function parseUserId(raw, fallback = "user-default") {
  const value = String(raw ?? fallback).trim() || fallback;
  if (!CHAT_ID_REGEX.test(value)) {
    throw new HttpError(400, "userId invalido");
  }
  return value;
}

export function parseUserName(raw) {
  const name = String(raw ?? "").trim();
  if (!name) {
    throw new HttpError(400, "Nome do perfil obrigatorio");
  }
  if (name.length > MAX_USER_NAME_LENGTH) {
    throw new HttpError(400, `Nome muito longo (max ${MAX_USER_NAME_LENGTH})`);
  }
  return name;
}

export function parseUserRole(raw, fallback = "operator") {
  const role = String(raw ?? fallback)
    .trim()
    .toLowerCase();
  if (!USER_ROLES.includes(role)) {
    throw new HttpError(400, "role invalida: use admin, operator ou viewer");
  }
  return role;
}

export function normalizeRole(role, fallback = "viewer") {
  const safeRole = String(role || "").trim().toLowerCase();
  return USER_ROLES.includes(safeRole) ? safeRole : fallback;
}

export function hasRequiredRole(userRole, minimumRole) {
  const current = ROLE_LEVEL[normalizeRole(userRole, "viewer")] || 0;
  const minimum = ROLE_LEVEL[normalizeRole(minimumRole, "viewer")] || 0;
  return current >= minimum;
}

export function parseTitle(raw, fallback = "Nova conversa") {
  const title = String(raw ?? fallback).trim();
  if (!title) {
    throw new HttpError(400, "Titulo obrigatorio");
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new HttpError(400, `Titulo muito longo (max ${MAX_TITLE_LENGTH})`);
  }
  return title;
}

export function parseMessage(body = {}) {
  const message = String(body.message ?? "").trim();
  if (!message) {
    throw new HttpError(400, "Mensagem obrigatoria");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(400, `Mensagem muito longa (max ${MAX_MESSAGE_LENGTH})`);
  }
  return message;
}

export function getMessageImages(body = {}) {
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

export function parseUserOnly(raw) {
  return raw === true || raw === "true";
}

export function parseBooleanLike(raw, fallback = false) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  if (raw === true || raw === "true" || raw === "1" || raw === 1) return true;
  if (raw === false || raw === "false" || raw === "0" || raw === 0) return false;
  throw new HttpError(400, "Valor booleano invalido");
}

export function parseTags(raw) {
  if (!Array.isArray(raw)) {
    throw new HttpError(400, "tags deve ser uma lista");
  }
  const tags = raw
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .map((tag) => tag.slice(0, 30));
  return [...new Set(tags)].slice(0, 10);
}

export function parseSystemPrompt(raw) {
  const prompt = String(raw ?? "").trim();
  if (prompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
    throw new HttpError(400, `System prompt muito longo (max ${MAX_SYSTEM_PROMPT_LENGTH})`);
  }
  return prompt;
}

export function parseTheme(raw) {
  const theme = String(raw ?? "").trim().toLowerCase();
  if (!["light", "dark", "system"].includes(theme)) {
    throw new HttpError(400, "Tema invalido: use light, dark ou system");
  }
  return theme;
}

export function parseUiPreferences(body = {}) {
  const prefs = {};
  if (body.theme !== undefined) {
    prefs.theme = parseTheme(body.theme);
  }
  const allowedKeys = new Set(["theme"]);
  const unknown = Object.keys(body).filter((key) => !allowedKeys.has(key));
  if (unknown.length) {
    throw new HttpError(400, `Preferencias desconhecidas: ${unknown.join(", ")}`);
  }
  if (!Object.keys(prefs).length) {
    throw new HttpError(400, "Nenhuma preferencia valida informada");
  }
  return prefs;
}

export function parseStorageLimitMb(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 50 || parsed > 10240) {
    throw new HttpError(400, "storageLimitMb invalido (use entre 50 e 10240)");
  }
  return parsed;
}

export function parseCleanupMode(raw) {
  const mode = String(raw || "dry-run").trim().toLowerCase();
  if (!["dry-run", "execute"].includes(mode)) {
    throw new HttpError(400, "mode invalido: use dry-run ou execute");
  }
  return mode;
}

export function parseCleanupTarget(raw) {
  const target = String(raw || "all").trim().toLowerCase();
  if (!["all", "uploads", "documents", "backups"].includes(target)) {
    throw new HttpError(400, "target invalido: use all, uploads, documents ou backups");
  }
  return target;
}

export function parseCleanupOlderThanDays(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 3650) {
    throw new HttpError(400, "olderThanDays invalido (use entre 0 e 3650)");
  }
  return parsed;
}

export function parseCleanupMaxDeleteMb(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 102400) {
    throw new HttpError(400, "maxDeleteMb invalido (use entre 1 e 102400)");
  }
  return parsed;
}

export function parseCleanupPreserveValidatedBackups(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 20) {
    throw new HttpError(400, "preserveValidatedBackups invalido (use entre 0 e 20)");
  }
  return parsed;
}

export function parseOperationalApprovalAction(raw) {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!OPERATIONAL_APPROVAL_ACTIONS.includes(value)) {
    throw new HttpError(400, `action invalida: use ${OPERATIONAL_APPROVAL_ACTIONS.join(", ")}`);
  }
  return value;
}

export function parseOperationalApprovalReason(raw, { required = true } = {}) {
  const value = String(raw ?? "").trim();
  if (!value && required) {
    throw new HttpError(400, "reason obrigatorio");
  }
  if (value.length > MAX_APPROVAL_REASON_LENGTH) {
    throw new HttpError(400, `reason muito longo (max ${MAX_APPROVAL_REASON_LENGTH})`);
  }
  return value || null;
}

export function parseOperationalApprovalWindowMinutes(raw, fallback = 30) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1440) {
    throw new HttpError(400, "windowMinutes invalido (use entre 1 e 1440)");
  }
  return parsed;
}

export function parseOperationalApprovalId(raw, fieldName = "approvalId") {
  return parseChatId(raw, fieldName);
}

export function parseOperationalApprovalDecision(raw) {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!["approve", "deny"].includes(value)) {
    throw new HttpError(400, "decision invalida: use approve ou deny");
  }
  return value;
}

export function parseOperationalApprovalStatus(raw) {
  const value = String(raw ?? "all")
    .trim()
    .toLowerCase();
  const allowed = ["all", "pending", "approved", "denied", "expired", "consumed"];
  if (!allowed.includes(value)) {
    throw new HttpError(400, `status invalido: use ${allowed.join(", ")}`);
  }
  return value;
}

export function parseIncidentStatus(raw, fallback = "normal") {
  const status = String(raw ?? fallback)
    .trim()
    .toLowerCase();
  if (!INCIDENT_STATUSES.includes(status)) {
    throw new HttpError(400, `incident.status invalido: use ${INCIDENT_STATUSES.join(", ")}`);
  }
  return status;
}

export function parseIncidentSeverity(raw, fallback = "info") {
  const severity = String(raw ?? fallback)
    .trim()
    .toLowerCase();
  if (!INCIDENT_SEVERITIES.includes(severity)) {
    throw new HttpError(400, `incident.severity invalido: use ${INCIDENT_SEVERITIES.join(", ")}`);
  }
  return severity;
}

export function parseIncidentSummary(raw, { required = false } = {}) {
  const summary = String(raw ?? "").trim();
  if (!summary && required) {
    throw new HttpError(400, "incident.summary obrigatorio");
  }
  if (summary.length > 280) {
    throw new HttpError(400, "incident.summary muito longo (max 280)");
  }
  return summary || null;
}

export function parseIncidentOwner(raw) {
  const owner = String(raw ?? "").trim();
  if (!owner) return null;
  if (owner.length > 80) {
    throw new HttpError(400, "incident.owner muito longo (max 80)");
  }
  return owner;
}

export function parseIncidentRecommendationType(raw) {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return null;
  const allowed = ["health", "slo", "backup", "rate-limiter", "security", "manual"];
  if (!allowed.includes(value)) {
    throw new HttpError(400, "incident.recommendationType invalido");
  }
  return value;
}

export function parseIncidentNextUpdateAt(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  return parseSearchDate(raw, "incident.nextUpdateAt");
}

export function parseIncidentRunbookType(raw) {
  const type = String(raw || "")
    .trim()
    .toLowerCase();
  if (!type || !Object.prototype.hasOwnProperty.call(INCIDENT_RUNBOOK_TYPES, type)) {
    throw new HttpError(400, `incident.runbookType invalido: use ${Object.keys(INCIDENT_RUNBOOK_TYPES).join(", ")}`);
  }
  return type;
}

export function parseIncidentRunbookMode(raw) {
  const mode = String(raw || "execute")
    .trim()
    .toLowerCase();
  if (!["dry-run", "execute", "rollback"].includes(mode)) {
    throw new HttpError(400, "incident.mode invalido: use dry-run, execute ou rollback");
  }
  return mode;
}

export function parseDisasterScenarioId(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = String(raw).trim().toLowerCase();
  if (!/^[a-z0-9:_-]{3,80}$/.test(value)) {
    throw new HttpError(400, "scenarioId invalido");
  }
  return value;
}

export function parseIntegrityManifest(content = "") {
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

export function parseAutoHealingPolicy(raw) {
  const policy = String(raw || "")
    .trim()
    .toLowerCase();
  if (!AUTO_HEALING_POLICIES.includes(policy)) {
    throw new HttpError(400, `autoHealing.policy invalida: use ${AUTO_HEALING_POLICIES.join(", ")}`);
  }
  return policy;
}

export function parseAutoHealingCooldownMs(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0 || value > 3_600_000) {
    throw new HttpError(400, "autoHealing.cooldownMs invalido (use entre 0 e 3600000)");
  }
  return value;
}

export function parseAutoHealingMaxAttempts(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1 || value > 20) {
    throw new HttpError(400, "autoHealing.maxAttempts invalido (use entre 1 e 20)");
  }
  return value;
}

export function parseAutoHealingWindowMs(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1_000 || value > 86_400_000) {
    throw new HttpError(400, "autoHealing.windowMs invalido (use entre 1000 e 86400000)");
  }
  return value;
}

export function parseAutoHealingConfigPatch(body = {}) {
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

export function parseIncidentUpdatePayload(body = {}) {
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
    patch.recommendationType = parseIncidentRecommendationType(body.recommendationType);
  }

  if (!Object.keys(patch).length) {
    throw new HttpError(400, "Body invalido: informe ao menos um campo de incidente");
  }

  return patch;
}

export function parseAuditFilters(query = {}) {
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

export function parseConfigKey(raw) {
  const key = String(raw || "").trim();
  if (!key) return null;
  if (!ALLOWED_CONFIG_KEYS.has(key)) {
    throw new HttpError(400, "configKey invalida");
  }
  return key;
}

export function parseConfigTargetType(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return null;
  if (!["chat", "user", "app"].includes(value)) {
    throw new HttpError(400, "targetType invalido");
  }
  return value;
}

export function parseConfigVersionId(raw) {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id < 1) {
    throw new HttpError(400, "versionId invalido");
  }
  return id;
}

export function parseConfigVersionFilters(query = {}) {
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

export function areConfigValuesEqual(left, right) {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return String(left) === String(right);
  }
}

export function parseChatListFilters(query = {}) {
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

export function parseSearchQuery(raw) {
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

export function parseSearchPage(raw) {
  if (raw === undefined) return 1;
  const page = Number.parseInt(raw, 10);
  if (!Number.isFinite(page) || page < 1) {
    throw new HttpError(400, "Parametro page invalido");
  }
  return page;
}

export function parseSearchLimit(raw) {
  if (raw === undefined) return 20;
  const limit = Number.parseInt(raw, 10);
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    throw new HttpError(400, "Parametro limit invalido");
  }
  return limit;
}

export function parseSearchRole(raw) {
  const role = String(raw || "all")
    .trim()
    .toLowerCase();
  if (!["all", "user", "assistant"].includes(role)) {
    throw new HttpError(400, "Parametro role invalido");
  }
  return role;
}

export function parseSearchDate(raw, fieldName) {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = String(raw).trim();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, `Parametro ${fieldName} invalido`);
  }
  return parsed.toISOString();
}

export function parseOptions(body = {}) {
  const temperature = Number.parseFloat(body.temperature);
  const context = Number.parseInt(body.context, 10);
  const safeTemperature = Number.isFinite(temperature) ? clamp(temperature, 0, 2) : 0.7;
  const safeContext = Number.isFinite(context) ? clamp(context, 256, 8192) : 2048;
  const model = String(body.model || "meu-llama3").trim() || "meu-llama3";

  return {
    model,
    temperature: safeTemperature,
    num_ctx: safeContext,
  };
}

export function parseRagOptions(body = {}) {
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

export function parseRagDocuments(body = {}) {
  if (!Array.isArray(body.documents)) {
    throw new HttpError(400, "documents deve ser uma lista");
  }

  if (body.documents.length > MAX_RAG_DOCS_PER_UPLOAD) {
    throw new HttpError(400, `Quantidade de documentos excede o limite (${MAX_RAG_DOCS_PER_UPLOAD})`);
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

export function buildRagSystemMessage(chunks = []) {
  if (!chunks.length) return null;

  const context = chunks
    .map((item) => `[Fonte: ${item.documentName}#trecho${item.chunkIndex}]\n${item.content}`)
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

export function buildSystemMessages({
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

export function parsePositiveInt(raw, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function parseOriginList(raw) {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function parseDirList(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseBackupPassphrase(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const str = String(raw).trim();
  if (!str) return null;
  if (str.length < MIN_BACKUP_PASSPHRASE_LENGTH) {
    throw new HttpError(
      400,
      `Passphrase muito curta: ao menos ${MIN_BACKUP_PASSPHRASE_LENGTH} caracteres`,
    );
  }
  if (str.length > MAX_BACKUP_PASSPHRASE_LENGTH) {
    throw new HttpError(
      400,
      `Passphrase muito longa: no maximo ${MAX_BACKUP_PASSPHRASE_LENGTH} caracteres`,
    );
  }
  return str;
}

export function parseBackupPayload(archiveBase64) {
  if (!archiveBase64 || typeof archiveBase64 !== "string") {
    throw new HttpError(400, "Arquivo de backup invalido");
  }
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(archiveBase64.trim())) {
    throw new HttpError(400, "Arquivo de backup invalido");
  }
  try {
    return Buffer.from(archiveBase64, "base64");
  } catch {
    throw new HttpError(400, "Arquivo de backup invalido");
  }
}

export function parseChatImportPayload(body = {}) {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Payload de importacao invalido");
  }
  const chat = body.chat;
  if (!chat || typeof chat !== "object") {
    throw new HttpError(400, "Payload invalido: falta campo chat");
  }
  if (!chat.title && typeof chat.title !== "string") {
    chat.title = "Conversa importada";
  }
  if (chat.messages && Array.isArray(chat.messages)) {
    for (const msg of chat.messages) {
      if (msg.role !== "user" && msg.role !== "assistant") {
        throw new HttpError(400, "Mensagem: role deve ser user ou assistant");
      }
    }
  }
  return body;
}