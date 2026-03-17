const API_BASE = window.location.origin;

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("msg");
const typingEl = document.getElementById("typing");
const sendBtnEl = document.getElementById("sendBtn");
const tabsEl = document.getElementById("chatTabs");
const newChatBtnEl = document.getElementById("newChatBtn");
const exportBtnEl = document.getElementById("exportBtn");
const exportJsonBtnEl = document.getElementById("exportJsonBtn");
const exportAllJsonBtnEl = document.getElementById("exportAllJsonBtn");
const importJsonBtnEl = document.getElementById("importJsonBtn");
const tabsMobileEl = document.getElementById("chatTabsMobile");
const newChatBtnMobileEl = document.getElementById("newChatBtnMobile");
const duplicateBtnEl = document.getElementById("duplicateBtn");
const duplicateBtnMobileEl = document.getElementById("duplicateBtnMobile");
const renameBtnEl = document.getElementById("renameBtn");
const deleteBtnEl = document.getElementById("deleteBtn");
const systemPromptBtnEl = document.getElementById("systemPromptBtn");
const renameBtnMobileEl = document.getElementById("renameBtnMobile");
const deleteBtnMobileEl = document.getElementById("deleteBtnMobile");
const exportBtnMobileEl = document.getElementById("exportBtnMobile");
const exportJsonBtnMobileEl = document.getElementById("exportJsonBtnMobile");
const exportAllJsonBtnMobileEl = document.getElementById(
  "exportAllJsonBtnMobile",
);
const backupBtnEl = document.getElementById("backupBtn");
const restoreBackupBtnEl = document.getElementById("restoreBackupBtn");
const backupBtnMobileEl = document.getElementById("backupBtnMobile");
const restoreBackupBtnMobileEl = document.getElementById(
  "restoreBackupBtnMobile",
);
const backupRestoreInputEl = document.getElementById("backupRestoreInput");
const importJsonBtnMobileEl = document.getElementById("importJsonBtnMobile");
const voiceBtnEl = document.getElementById("voiceBtn");
const imageInputEl = document.getElementById("imageInput");
const duplicateModalEl = document.getElementById("duplicateModal");
const duplicateTitleInputEl = document.getElementById("duplicateTitleInput");
const duplicateModeFullEl = document.getElementById("duplicateModeFull");
const duplicateModeUserEl = document.getElementById("duplicateModeUser");
const duplicateCancelBtnEl = document.getElementById("duplicateCancelBtn");
const duplicateConfirmBtnEl = document.getElementById("duplicateConfirmBtn");
const ollamaStatusBadgeEl = document.getElementById("ollamaStatusBadge");
const userPromptBtnEl = document.getElementById("userPromptBtn");
const shortcutsHelpBtnEl = document.getElementById("shortcutsHelpBtn");
const shortcutsModalEl = document.getElementById("shortcutsModal");
const shortcutsCloseBtnEl = document.getElementById("shortcutsCloseBtn");
const userSelectEl = document.getElementById("userSelect");
const darkModeBtnEl = document.getElementById("darkModeBtn");
const sunIconEl = document.getElementById("sunIcon");
const moonIconEl = document.getElementById("moonIcon");
const autoIconEl = document.getElementById("autoIcon");
const storageUsageTextEl = document.getElementById("storageUsageText");
const storageAlertTextEl = document.getElementById("storageAlertText");
const storageRefreshBtnEl = document.getElementById("storageRefreshBtn");
const storageCleanupBtnEl = document.getElementById("storageCleanupBtn");
const storageLimitBtnEl = document.getElementById("storageLimitBtn");
const telemetryOptInEl = document.getElementById("telemetryOptIn");
const telemetryStatsBtnEl = document.getElementById("telemetryStatsBtn");
const auditExportBtnEl = document.getElementById("auditExportBtn");
const configHistoryBtnEl = document.getElementById("configHistoryBtn");
const diagnosticsExportBtnEl = document.getElementById("diagnosticsExportBtn");
const healthRefreshBtnEl = document.getElementById("healthRefreshBtn");
const healthSummaryTextEl = document.getElementById("healthSummaryText");
const healthChecksTextEl = document.getElementById("healthChecksText");

const state = {
  chats: [],
  activeChatId: null,
  recognition: null,
  isListening: false,
  duplicateResolver: null,
  confirmResolver: null,
  voiceHistory: [],
  isDarkMode: false,
  retryAction: null,
  statusTimer: null,
  onboardingChecksOk: false,
  search: {
    query: "",
    role: "all",
    from: "",
    to: "",
    page: 1,
    limit: 5,
    totalPages: 0,
    total: 0,
  },
  rag: {
    enabled: false,
    docCount: 0,
  },
  userId: localStorage.getItem("chatUserId") || "user-default",
  users: [],
  themeMode: localStorage.getItem("themeMode") || "system",
  chatFilters: {
    mode: "all",
    tag: "",
  },
  telemetryEnabled: false,
  ollamaStatus: "unknown",
  ollamaPollingTimer: null,
  storage: {
    dbBytes: 0,
    uploadsBytes: 0,
    documentsBytes: 0,
    backupsBytes: 0,
    totalBytes: 0,
    storageLimitMb: 512,
    usagePercent: 0,
  },
  health: {
    status: "unknown",
    checks: {
      db: { status: "unknown" },
      model: { status: "unknown" },
      disk: { status: "unknown" },
    },
    alerts: [],
  },
};

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderUsers() {
  if (!userSelectEl) return;
  userSelectEl.innerHTML = "";
  state.users.forEach((user) => {
    const opt = document.createElement("option");
    opt.value = user.id;
    opt.textContent = user.name;
    if (user.id === state.userId) opt.selected = true;
    userSelectEl.appendChild(opt);
  });
}

function normalizeThemeMode(mode) {
  return ["light", "dark", "system"].includes(mode) ? mode : "system";
}

function getCurrentUser() {
  return (state.users || []).find((user) => user.id === state.userId) || null;
}

function isDarkForMode(mode) {
  const safeMode = normalizeThemeMode(mode);
  if (safeMode === "dark") return true;
  if (safeMode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function updateThemeToggleUi(mode) {
  const safeMode = normalizeThemeMode(mode);
  if (sunIconEl) sunIconEl.classList.toggle("hidden", safeMode !== "light");
  if (moonIconEl) moonIconEl.classList.toggle("hidden", safeMode !== "dark");
  if (autoIconEl) autoIconEl.classList.toggle("hidden", safeMode !== "system");

  if (darkModeBtnEl) {
    const labels = {
      light: "Tema: claro",
      dark: "Tema: escuro",
      system: "Tema: sistema",
    };
    darkModeBtnEl.title = labels[safeMode];
  }
}

function applyThemeMode(mode, options = {}) {
  const { persistLocal = true } = options;
  const safeMode = normalizeThemeMode(mode);
  state.themeMode = safeMode;
  state.isDarkMode = isDarkForMode(safeMode);

  document.documentElement.classList.toggle("dark", state.isDarkMode);
  updateThemeToggleUi(safeMode);

  if (persistLocal) {
    localStorage.setItem("themeMode", safeMode);
  }
}

function cycleThemeMode() {
  const order = ["light", "dark", "system"];
  const idx = order.indexOf(normalizeThemeMode(state.themeMode));
  const next = order[(idx + 1) % order.length];
  applyThemeMode(next, { persistLocal: true });
  return next;
}

async function saveThemeForCurrentUser(theme) {
  if (!state.userId) return;
  await fetchJson(`/api/users/${encodeURIComponent(state.userId)}/theme`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme }),
  });
  const current = getCurrentUser();
  if (current) current.theme = theme;
}

function syncThemeFromCurrentUser() {
  const user = getCurrentUser();
  const profileTheme = normalizeThemeMode(user?.theme || "system");
  applyThemeMode(profileTheme, { persistLocal: true });
}

async function loadUsers() {
  try {
    const data = await fetchJson("/api/users");
    state.users = data.users || [];
    if (!state.users.some((user) => user.id === state.userId)) {
      state.userId = "user-default";
      localStorage.setItem("chatUserId", state.userId);
    }
    renderUsers();
    syncThemeFromCurrentUser();
    updateRbacUi();
    await loadStorageUsage();
  } catch (error) {
    console.error("Nao foi possivel carregar perfis:", error.message);
  }
}

async function switchUser(userId) {
  state.userId = userId;
  localStorage.setItem("chatUserId", userId);
  try {
    await fetchJson("/api/audit/profile-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  } catch (error) {
    console.error("Falha ao registrar troca de perfil:", error.message);
  }
  renderUsers();
  syncThemeFromCurrentUser();
  updateRbacUi();
  await loadChats();
  await loadRagDocuments();
  await loadStorageUsage();
}

async function createProfile() {
  const name = window.prompt("Nome do novo perfil:");
  if (name === null) return;

  const trimmed = name.trim();
  if (!trimmed) return;

  try {
    const payload = await fetchJson("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    await loadUsers();
    await switchUser(payload.user.id);
    showStatus(`Perfil "${trimmed}" criado com sucesso.`, {
      type: "success",
      autoHideMs: 3000,
    });
  } catch (error) {
    showStatus(`Nao foi possivel criar perfil: ${error.message}`, {
      type: "error",
    });
  }
}

async function renameCurrentProfile() {
  const current = state.users.find((user) => user.id === state.userId);
  if (!current) return;

  const name = window.prompt("Novo nome do perfil:", current.name || "");
  if (name === null) return;

  const trimmed = name.trim();
  if (!trimmed || trimmed === current.name) return;

  try {
    await fetchJson(`/api/users/${encodeURIComponent(state.userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    await loadUsers();
    showStatus("Perfil renomeado com sucesso.", {
      type: "success",
      autoHideMs: 3000,
    });
  } catch (error) {
    showStatus(`Nao foi possivel renomear perfil: ${error.message}`, {
      type: "error",
    });
  }
}

async function deleteCurrentProfile() {
  if (state.userId === "user-default") {
    showStatus("O perfil padrao nao pode ser excluido.", {
      type: "error",
      autoHideMs: 3000,
    });
    return;
  }

  const current = state.users.find((user) => user.id === state.userId);
  const confirmed = window.confirm(
    `Excluir o perfil "${current?.name || state.userId}" e TODAS as suas conversas?`,
  );
  if (!confirmed) return;

  try {
    await fetchJson(`/api/users/${encodeURIComponent(state.userId)}`, {
      method: "DELETE",
    });
    state.userId = "user-default";
    localStorage.setItem("chatUserId", state.userId);
    await loadUsers();
    await loadChats();
    await loadRagDocuments();
    showStatus("Perfil excluido com sucesso.", {
      type: "success",
      autoHideMs: 3000,
    });
  } catch (error) {
    showStatus(`Nao foi possivel excluir perfil: ${error.message}`, {
      type: "error",
    });
  }
}

function buildChatsQueryString() {
  const params = new URLSearchParams();
  params.set("userId", state.userId);

  if (state.chatFilters.mode === "favorites") {
    params.set("favorite", "true");
  }
  if (state.chatFilters.mode === "archived") {
    params.set("archived", "true");
  }
  if (state.chatFilters.tag) {
    params.set("tag", state.chatFilters.tag);
  }

  return params.toString();
}

function formatBytes(value) {
  const bytes = Number.parseInt(value, 10) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function renderStorageUsage() {
  if (!storageUsageTextEl) return;
  const storage = state.storage || {};
  storageUsageTextEl.textContent =
    `DB ${formatBytes(storage.dbBytes)} | uploads ${formatBytes(storage.uploadsBytes)} | documentos ${formatBytes(storage.documentsBytes)} | total ${formatBytes(storage.totalBytes)} / limite ${storage.storageLimitMb} MB`;

  if (!storageAlertTextEl) return;
  const usagePercent = Number.parseInt(storage.usagePercent, 10) || 0;
  if (usagePercent >= 95) {
    storageAlertTextEl.textContent = `Alerta critico: ${usagePercent}% do limite utilizado.`;
    return;
  }
  if (usagePercent >= 80) {
    storageAlertTextEl.textContent = `Atencao: ${usagePercent}% do limite utilizado.`;
    return;
  }
  storageAlertTextEl.textContent = `Saudavel: ${usagePercent}% do limite utilizado.`;
}

async function loadStorageUsage() {
  if (!state.userId) return;
  try {
    const data = await fetchJson(
      `/api/storage/usage?userId=${encodeURIComponent(state.userId)}`,
    );
    state.storage = {
      dbBytes: data?.usage?.dbBytes || 0,
      uploadsBytes: data?.usage?.uploadsBytes || 0,
      documentsBytes: data?.usage?.documentsBytes || 0,
      backupsBytes: data?.usage?.backupsBytes || 0,
      totalBytes: data?.usage?.totalBytes || 0,
      storageLimitMb: data?.limit?.storageLimitMb || 512,
      usagePercent: data?.usagePercent || 0,
    };
    renderStorageUsage();
  } catch (error) {
    if (storageAlertTextEl) {
      storageAlertTextEl.textContent = "Falha ao carregar uso de armazenamento.";
    }
    console.error("Falha em loadStorageUsage:", error.message);
  }
}

async function runStorageCleanup() {
  const olderThanDaysRaw = window.prompt(
    "Remover arquivos mais antigos que quantos dias?",
    "30",
  );
  if (olderThanDaysRaw === null) return;

  const maxDeleteMbRaw = window.prompt(
    "Limite maximo de limpeza (MB):",
    "500",
  );
  if (maxDeleteMbRaw === null) return;

  const dryRun = await fetchJson("/api/storage/cleanup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "dry-run",
      target: "all",
      olderThanDays: Number.parseInt(olderThanDaysRaw, 10),
      maxDeleteMb: Number.parseInt(maxDeleteMbRaw, 10),
    }),
  });

  const summary = dryRun?.cleanup || {};
  const confirmed = await openConfirmModal(
    `Dry-run: ${summary.filesCount || 0} arquivo(s), estimativa ${formatBytes(summary.estimatedFreedBytes || 0)}. Executar limpeza agora?`,
  );
  if (!confirmed) return;

  await fetchJson("/api/storage/cleanup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "execute",
      target: "all",
      olderThanDays: Number.parseInt(olderThanDaysRaw, 10),
      maxDeleteMb: Number.parseInt(maxDeleteMbRaw, 10),
    }),
  });

  await loadStorageUsage();
  showStatus("Limpeza de armazenamento concluida.", {
    type: "success",
    autoHideMs: 3000,
  });
}

async function updateStorageLimitForCurrentUser() {
  if (!state.userId) return;
  const current = Number.parseInt(state.storage.storageLimitMb, 10) || 512;
  const raw = window.prompt("Novo limite de armazenamento (MB):", String(current));
  if (raw === null) return;

  await fetchJson(`/api/users/${encodeURIComponent(state.userId)}/storage-limit`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storageLimitMb: Number.parseInt(raw, 10) }),
  });

  await loadUsers();
  await loadStorageUsage();
  showStatus("Limite de armazenamento atualizado.", {
    type: "success",
    autoHideMs: 2500,
  });
}

function updateFilterUi() {
  const isAll = state.chatFilters.mode === "all";
  const isFavorites = state.chatFilters.mode === "favorites";
  const isArchived = state.chatFilters.mode === "archived";

  if (filterAllBtnEl) filterAllBtnEl.classList.toggle("bg-slate-100", isAll);
  if (filterFavoritesBtnEl)
    filterFavoritesBtnEl.classList.toggle("bg-slate-100", isFavorites);
  if (filterArchivedBtnEl)
    filterArchivedBtnEl.classList.toggle("bg-slate-100", isArchived);

  if (filterTagInputEl) {
    filterTagInputEl.value = state.chatFilters.tag;
  }
}

async function setFilterMode(mode) {
  state.chatFilters.mode = mode;
  updateFilterUi();
  await loadChats();
}

async function loadTelemetryState() {
  try {
    const data = await fetchJson("/api/telemetry");
    state.telemetryEnabled = !!data.enabled;
    if (telemetryOptInEl) telemetryOptInEl.checked = state.telemetryEnabled;
  } catch (error) {
    console.error("Nao foi possivel carregar estado da telemetria:", error);
  }
}

async function checkOllamaStatus() {
  try {
    const data = await fetchJson("/api/health");
    state.ollamaStatus = data.ollama === "online" ? "online" : "offline";
    state.health = {
      status: data.status || "unknown",
      checks: data.checks || {
        db: { status: "unknown" },
        model: { status: "unknown" },
        disk: { status: "unknown" },
      },
      rateLimiter: data.rateLimiter || null,
      alerts: Array.isArray(data.alerts) ? data.alerts : [],
    };
  } catch (_err) {
    state.ollamaStatus = "offline";
    state.health = {
      status: "unhealthy",
      checks: {
        db: { status: "unknown" },
        model: { status: "unhealthy" },
        disk: { status: "unknown" },
      },
      alerts: ["Falha ao consultar endpoint de health"],
    };
  }

  if (!ollamaStatusBadgeEl) return;

  if (state.ollamaStatus === "online") {
    ollamaStatusBadgeEl.className =
      "inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500";
    ollamaStatusBadgeEl.title = "Ollama conectado";
  } else {
    ollamaStatusBadgeEl.className =
      "inline-block h-2 w-2 shrink-0 rounded-full bg-red-500";
    ollamaStatusBadgeEl.title = "Ollama offline";
  }

  if (healthSummaryTextEl) {
    const labels = {
      healthy: "Saudavel",
      degraded: "Degradado",
      unhealthy: "Critico",
      unknown: "Desconhecido",
    };
    healthSummaryTextEl.textContent = `Status: ${labels[state.health.status] || "Desconhecido"}`;
  }

  if (healthChecksTextEl) {
    const dbStatus = state.health?.checks?.db?.status || "unknown";
    const modelStatus = state.health?.checks?.model?.status || "unknown";
    const diskStatus = state.health?.checks?.disk?.status || "unknown";
    const lines = [
      `DB: ${dbStatus}`,
      `Modelo: ${modelStatus}`,
      `Disco: ${diskStatus}`,
    ];
    const rl = state.health?.rateLimiter;
    if (rl) {
      lines.push(
        `Fila: ${rl.currentQueueSize}/${rl.queueMax} | Enfileiradas: ${rl.queuedTotal} | Rejeitadas: ${rl.rejectedTotal}`,
      );
    }
    const alerts = (state.health.alerts || []).slice(0, 2);
    if (alerts.length) {
      lines.push(`Alerta: ${alerts.join(" | ")}`);
    }
    healthChecksTextEl.textContent = lines.join(" • ");
  }
}

async function setTelemetryEnabled(enabled) {
  try {
    const data = await fetchJson("/api/telemetry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !!enabled }),
    });
    state.telemetryEnabled = !!data.enabled;
    if (telemetryOptInEl) telemetryOptInEl.checked = state.telemetryEnabled;
    showStatus(
      state.telemetryEnabled
        ? "Telemetria local ativada."
        : "Telemetria local desativada e limpa.",
      { type: "success", autoHideMs: 2500 },
    );
  } catch (error) {
    showStatus(`Nao foi possivel atualizar telemetria: ${error.message}`, {
      type: "error",
    });
  }
}

async function showTelemetryStats() {
  try {
    const data = await fetchJson("/api/telemetry");
    const lines = (data.stats || []).slice(0, 10).map((item) => {
      return `${item.method} ${item.path} | req=${item.count} err=${item.errors} avg=${item.avgMs}ms`;
    });
    const text = lines.length
      ? lines.join("\n")
      : "Sem metricas registradas ainda.";
    window.alert(text);
  } catch (error) {
    showStatus(`Nao foi possivel carregar metricas: ${error.message}`, {
      type: "error",
    });
  }
}

async function exportAuditLogsJson() {
  try {
    const response = await fetch(
      `${API_BASE}/api/audit/export?userId=${encodeURIComponent(state.userId)}`,
    );
    if (!response.ok) {
      throw new Error("Falha ao exportar auditoria");
    }

    const jsonText = await response.text();
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-${state.userId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    showStatus("Auditoria exportada com sucesso.", {
      type: "success",
      autoHideMs: 2500,
    });
  } catch (error) {
    showStatus(`Falha ao exportar auditoria: ${error.message}`, {
      type: "error",
      retryAction: () => exportAuditLogsJson(),
    });
    throw error;
  }
}

async function exportDiagnosticsPackage() {
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/export`, {
      headers: { "x-user-id": state.userId || "" },
    });

    if (!response.ok) {
      const traceId = response.headers.get("x-trace-id");
      let msg = "Falha ao exportar diagnostico";
      try {
        const data = await response.json();
        msg = data?.error || msg;
      } catch {
        /* noop */
      }
      const err = new Error(msg);
      err.traceId = traceId;
      throw err;
    }

    const jsonText = await response.text();
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    showStatus("Pacote de diagnostico exportado com sucesso.", {
      type: "success",
      autoHideMs: 2500,
    });
  } catch (error) {
    showStatus(`Falha ao exportar diagnostico: ${error.message}`, {
      type: "error",
      traceId: error.traceId,
      retryAction: () => exportDiagnosticsPackage(),
    });
    throw error;
  }
}

function formatConfigVersionLabel(item) {
  const map = {
    "chat.systemPrompt": "Prompt da conversa",
    "user.defaultSystemPrompt": "Prompt padrao do perfil",
    "user.theme": "Tema do perfil",
    "user.storageLimitMb": "Limite de armazenamento",
    "app.telemetryEnabled": "Telemetria local",
  };
  const label = map[item.configKey] || item.configKey;
  const target = item.targetId ? ` (${item.targetType}:${item.targetId})` : "";
  return `${label}${target}`;
}

function formatConfigVersionValue(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) return "null";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function openConfigHistoryRollback() {
  const response = await fetchJson("/api/config/versions?limit=20");
  const versions = Array.isArray(response.versions) ? response.versions : [];

  if (!versions.length) {
    showStatus("Ainda nao ha versoes de configuracao registradas.", {
      type: "success",
      autoHideMs: 2500,
    });
    return;
  }

  const lines = versions.slice(0, 12).map((item) => {
    const when = formatDateLabel(item.createdAt);
    const by = item.actorUserId ? ` por ${item.actorUserId}` : "";
    return `#${item.id} | ${formatConfigVersionLabel(item)} | ${formatConfigVersionValue(item.value)} | ${when}${by}`;
  });

  const picked = window.prompt(
    `Historico de configuracoes:\n\n${lines.join("\n")}\n\nDigite o ID da versao para restaurar:`,
  );
  if (picked === null) return;

  const versionId = Number.parseInt(String(picked).trim(), 10);
  if (!Number.isFinite(versionId) || versionId < 1) {
    showStatus("ID de versao invalido.", {
      type: "error",
      autoHideMs: 2500,
    });
    return;
  }

  const selected = versions.find((item) => item.id === versionId);
  if (!selected) {
    showStatus("Versao nao encontrada na listagem atual.", {
      type: "error",
      autoHideMs: 2500,
    });
    return;
  }

  const confirmed = window.confirm(
    `Restaurar a versao #${selected.id}?\n${formatConfigVersionLabel(selected)} = ${formatConfigVersionValue(selected.value)}`,
  );
  if (!confirmed) return;

  const rollback = await fetchJson(
    `/api/config/versions/${encodeURIComponent(versionId)}/rollback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );

  await loadTelemetryState();
  await loadUsers();
  await loadChats();

  showStatus(
    rollback.changed
      ? "Rollback de configuracao aplicado com sucesso."
      : "Rollback idempotente: configuracao ja estava no valor selecionado.",
    {
      type: "success",
      autoHideMs: 3000,
    },
  );
}

function formatDateLabel(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

function getCurrentUserRole() {
  const user = getCurrentUser();
  const role = String(user?.role || "viewer").toLowerCase();
  if (["admin", "operator", "viewer"].includes(role)) return role;
  return "viewer";
}

function hasRole(minimumRole) {
  const levels = { viewer: 1, operator: 2, admin: 3 };
  const current = levels[getCurrentUserRole()] || 0;
  const required = levels[minimumRole] || 0;
  return current >= required;
}

function updateRbacUi() {
  const isAdmin = hasRole("admin");
  const isOperator = hasRole("operator");

  // Acoes exclusivas de admin
  const adminOnly = [
    document.getElementById("newUserBtn"),
    document.getElementById("renameUserBtn"),
    document.getElementById("deleteUserBtn"),
    document.getElementById("backupBtn"),
    document.getElementById("backupBtnMobile"),
    document.getElementById("restoreBackupBtn"),
    document.getElementById("restoreBackupBtnMobile"),
    document.getElementById("storageCleanupBtn"),
    document.getElementById("storageLimitBtn"),
    document.getElementById("auditExportBtn"),
    document.getElementById("configHistoryBtn"),
    document.getElementById("telemetryOptIn"),
    document.getElementById("diagnosticsExportBtn"),
    document.getElementById("telemetryStatsBtn"),
  ];

  // Acoes que operador tambem pode fazer
  const operatorAndAbove = [
    document.getElementById("exportJsonBtn"),
    document.getElementById("exportJsonBtnMobile"),
    document.getElementById("importJsonBtn"),
    document.getElementById("importJsonBtnMobile"),
    document.getElementById("exportAllJsonBtn"),
    document.getElementById("exportAllJsonBtnMobile"),
  ];

  for (const el of adminOnly) {
    if (!el) continue;
    el.hidden = !isAdmin;
    el.disabled = !isAdmin;
  }

  for (const el of operatorAndAbove) {
    if (!el) continue;
    el.hidden = !isOperator;
    el.disabled = !isOperator;
  }

  const roleBadgeEl = document.getElementById("currentRoleBadge");
  if (roleBadgeEl) {
    const labels = { admin: "Admin", operator: "Operador", viewer: "Visualizador" };
    roleBadgeEl.textContent = labels[getCurrentUserRole()] || "Visualizador";
  }
}


function clearSearchResults() {
  state.search.page = 1;
  state.search.total = 0;
  state.search.totalPages = 0;

  if (searchResultsEl) {
    searchResultsEl.innerHTML = "";
    searchResultsEl.classList.add("hidden");
  }
  if (searchPageInfoEl) {
    searchPageInfoEl.textContent = "Sem resultados de busca.";
  }
  if (searchPrevBtnEl) searchPrevBtnEl.disabled = true;
  if (searchNextBtnEl) searchNextBtnEl.disabled = true;
}

function renderRagStatus() {
  if (!ragStatusEl) return;

  if (!state.activeChatId) {
    ragStatusEl.textContent = "Selecione uma aba para usar documentos locais.";
    return;
  }

  if (state.rag.docCount > 0) {
    ragStatusEl.textContent = `${state.rag.docCount} documento(s) indexado(s) nesta aba.`;
  } else {
    ragStatusEl.textContent = "Base documental vazia para esta aba.";
  }
}

async function loadRagDocuments() {
  if (!state.activeChatId) {
    state.rag.docCount = 0;
    renderRagStatus();
    return;
  }

  try {
    const data = await fetchJson(
      `/api/chats/${encodeURIComponent(state.activeChatId)}/rag/documents`,
    );
    state.rag.docCount = Array.isArray(data.documents)
      ? data.documents.length
      : 0;
    renderRagStatus();
  } catch (error) {
    state.rag.docCount = 0;
    renderRagStatus();
    showStatus(`Falha ao carregar base documental: ${error.message}`, {
      type: "error",
      retryAction: () => loadRagDocuments(),
    });
  }
}

async function filesToDocuments(files) {
  const selected = Array.isArray(files) ? files : [];
  const docs = [];

  for (const file of selected.slice(0, 6)) {
    const content = await file.text();
    const normalized = String(content || "").trim();
    if (!normalized) continue;
    docs.push({
      name: file.name,
      content: normalized,
    });
  }

  return docs;
}

async function uploadRagDocuments() {
  if (!state.activeChatId) {
    showStatus("Selecione uma aba para enviar documentos.", { type: "error" });
    return;
  }

  const files = Array.from(docInputEl?.files || []);
  if (!files.length) {
    showStatus("Selecione ao menos um arquivo de texto para indexar.", {
      type: "info",
      autoHideMs: 2500,
    });
    return;
  }

  try {
    const documents = await filesToDocuments(files);
    if (!documents.length) {
      throw new Error(
        "Nenhum arquivo com conteudo textual valido foi encontrado",
      );
    }

    const payload = await fetchJson(
      `/api/chats/${encodeURIComponent(state.activeChatId)}/rag/documents`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents }),
      },
    );

    state.rag.docCount = Array.isArray(payload.documents)
      ? payload.documents.length
      : state.rag.docCount;
    renderRagStatus();
    if (docInputEl) docInputEl.value = "";
    showStatus("Documentos indexados com sucesso.", { type: "success" });
  } catch (error) {
    showStatus(`Falha ao indexar documentos: ${error.message}`, {
      type: "error",
      retryAction: () => uploadRagDocuments(),
    });
  }
}

function appendHighlightedText(container, text, query) {
  const safeText = String(text || "");
  if (!query) {
    container.textContent = safeText;
    return;
  }

  const regex = new RegExp(`(${escapeRegExp(query)})`, "ig");
  const parts = safeText.split(regex);

  for (const part of parts) {
    if (!part) continue;
    if (part.toLowerCase() === query.toLowerCase()) {
      const mark = document.createElement("mark");
      mark.className = "rounded bg-amber-200/70 px-0.5 text-slate-900";
      mark.textContent = part;
      container.appendChild(mark);
    } else {
      container.appendChild(document.createTextNode(part));
    }
  }
}

function renderSearchResults(matches = []) {
  if (!searchResultsEl) return;

  searchResultsEl.innerHTML = "";
  if (!matches.length) {
    searchResultsEl.classList.add("hidden");
    return;
  }

  searchResultsEl.classList.remove("hidden");

  matches.forEach((item) => {
    const card = document.createElement("article");
    card.className =
      "rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-700 dark:bg-slate-900/40";

    const meta = document.createElement("p");
    meta.className =
      "mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
    const roleLabel = item.role === "assistant" ? "Assistente" : "Usuario";
    const dateLabel = formatDateLabel(item.createdAt);
    meta.textContent = dateLabel ? `${roleLabel} • ${dateLabel}` : roleLabel;

    const content = document.createElement("p");
    content.className =
      "whitespace-pre-wrap text-slate-700 dark:text-slate-200";
    appendHighlightedText(content, item.content, state.search.query);

    card.appendChild(meta);
    card.appendChild(content);
    searchResultsEl.appendChild(card);
  });
}

function updateSearchPaginationUi() {
  const { page, totalPages, total } = state.search;

  if (searchPageInfoEl) {
    if (total > 0) {
      searchPageInfoEl.textContent = `Resultados: ${total} • Pagina ${page}/${totalPages}`;
    } else if (state.search.query) {
      searchPageInfoEl.textContent = "Nenhum resultado para os filtros atuais.";
    } else {
      searchPageInfoEl.textContent = "Sem resultados de busca.";
    }
  }

  if (searchPrevBtnEl) searchPrevBtnEl.disabled = page <= 1;
  if (searchNextBtnEl)
    searchNextBtnEl.disabled = totalPages === 0 || page >= totalPages;
}

async function runHistorySearch({ resetPage = false } = {}) {
  if (!state.activeChatId) return;

  const query = (searchInputEl?.value || "").trim();
  const role = searchRoleEl?.value || "all";
  const from = searchFromEl?.value || "";
  const to = searchToEl?.value || "";

  state.search.query = query;
  state.search.role = role;
  state.search.from = from;
  state.search.to = to;
  if (resetPage) state.search.page = 1;

  if (!query) {
    clearSearchResults();
    return;
  }

  const params = new URLSearchParams({
    q: query,
    role,
    limit: String(state.search.limit),
    page: String(state.search.page),
  });

  if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
  if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());

  try {
    const data = await fetchJson(
      `/api/chats/${encodeURIComponent(state.activeChatId)}/search?${params.toString()}`,
    );

    const pagination = data.pagination || {};
    state.search.total = Number.parseInt(pagination.total, 10) || 0;
    state.search.totalPages = Number.parseInt(pagination.totalPages, 10) || 0;
    state.search.page =
      Number.parseInt(pagination.page, 10) || state.search.page;

    renderSearchResults(data.matches || []);
    updateSearchPaginationUi();
    hideStatus();
  } catch (error) {
    showStatus(`Falha na busca: ${error.message}`, {
      type: "error",
      retryAction: () => runHistorySearch({ resetPage: false }),
    });
  }
}

function getPreferredModel() {
  return localStorage.getItem("preferredModel") || "";
}

function savePreferredModel(model) {
  if (!model) return;
  localStorage.setItem("preferredModel", model);
}

function applyPreferredModel() {
  const preferred = getPreferredModel();
  if (!preferred) return;

  const modelSelect = document.getElementById("modelo");
  if (!modelSelect) return;
  const exists = Array.from(modelSelect.options).some(
    (opt) => opt.value === preferred,
  );
  if (exists) {
    modelSelect.value = preferred;
  }
}

function resetOnboardingStatus() {
  state.onboardingChecksOk = false;
  if (onboardingHealthStatusEl)
    onboardingHealthStatusEl.textContent = "API: pendente";
  if (onboardingSmokeStatusEl)
    onboardingSmokeStatusEl.textContent = "Teste de chat: pendente";
}

function syncOnboardingModels() {
  const mainModelSelect = document.getElementById("modelo");
  if (!mainModelSelect || !onboardingModelSelectEl) return;

  onboardingModelSelectEl.innerHTML = "";
  Array.from(mainModelSelect.options).forEach((opt) => {
    const cloned = document.createElement("option");
    cloned.value = opt.value;
    cloned.textContent = opt.textContent;
    onboardingModelSelectEl.appendChild(cloned);
  });

  onboardingModelSelectEl.value = mainModelSelect.value;
}

function closeOnboardingModal() {
  if (!onboardingModalEl) return;
  onboardingModalEl.classList.add("hidden");
  onboardingModalEl.classList.remove("flex");
}

function openOnboardingModal() {
  if (!onboardingModalEl) return;
  syncOnboardingModels();
  resetOnboardingStatus();
  onboardingModalEl.classList.remove("hidden");
  onboardingModalEl.classList.add("flex");
}

async function runOnboardingChecks() {
  const selectedModel = onboardingModelSelectEl?.value || getControls().model;
  const modelSelect = document.getElementById("modelo");
  if (modelSelect && selectedModel) {
    modelSelect.value = selectedModel;
    savePreferredModel(selectedModel);
  }

  state.onboardingChecksOk = false;
  if (onboardingHealthStatusEl)
    onboardingHealthStatusEl.textContent = "API: verificando...";
  if (onboardingSmokeStatusEl)
    onboardingSmokeStatusEl.textContent = "Teste de chat: aguardando...";

  try {
    const health = await fetch(`${API_BASE}/healthz`);
    if (!health.ok) {
      throw new Error("API indisponivel");
    }
    if (onboardingHealthStatusEl)
      onboardingHealthStatusEl.textContent = "API: conectada";
  } catch (error) {
    if (onboardingHealthStatusEl)
      onboardingHealthStatusEl.textContent = `API: falha (${error.message})`;
    if (onboardingSmokeStatusEl)
      onboardingSmokeStatusEl.textContent = "Teste de chat: cancelado";
    showStatus(`Falha no onboarding: ${error.message}`, { type: "error" });
    return;
  }

  const tempChatId = `onboarding-${Date.now()}`;
  try {
    const testResponse = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: tempChatId,
        model: selectedModel,
        message: "Responda apenas OK para validar onboarding.",
        temperature: 0,
        context: 512,
      }),
    });

    if (!testResponse.ok) {
      throw new Error(`HTTP ${testResponse.status}`);
    }

    const payload = await testResponse.json();
    const reply = String(payload.reply || "").trim();
    if (!reply) {
      throw new Error("resposta vazia");
    }

    if (onboardingSmokeStatusEl) {
      onboardingSmokeStatusEl.textContent = `Teste de chat: ok (${reply.slice(0, 24)})`;
    }

    state.onboardingChecksOk = true;
    showStatus("Onboarding validado com sucesso.", { type: "success" });
  } catch (error) {
    if (onboardingSmokeStatusEl)
      onboardingSmokeStatusEl.textContent = `Teste de chat: falha (${error.message})`;
    showStatus(`Falha no teste rapido: ${error.message}`, { type: "error" });
  } finally {
    try {
      await fetch(`${API_BASE}/api/chats/${encodeURIComponent(tempChatId)}`, {
        method: "DELETE",
      });
    } catch {
      // Ignora falha de limpeza do chat temporario.
    }
  }
}

function hideStatus() {
  if (!statusBarEl) return;
  statusBarEl.classList.add("hidden");
  statusBarEl.classList.remove("flex");
  state.retryAction = null;

  if (state.statusTimer) {
    clearTimeout(state.statusTimer);
    state.statusTimer = null;
  }
}

function showStatus(message, options = {}) {
  if (!statusBarEl || !statusTextEl) return;

  const type = options.type || "error";
  const retryAction = options.retryAction || null;
  const autoHideMs = options.autoHideMs ?? (type === "success" ? 3000 : 0);

  const traceId = options.traceId || null;
  const displayText =
    traceId && type === "error"
      ? `${message} [ocorrencia: ${traceId.slice(0, 8)}]`
      : message;
  statusTextEl.textContent = displayText;
  statusBarEl.classList.remove("hidden");
  statusBarEl.classList.add("flex");

  statusBarEl.className =
    "mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm sm:mx-6";

  if (type === "error") {
    statusBarEl.classList.add(
      "border-rose-300",
      "bg-rose-50",
      "text-rose-700",
      "dark:border-rose-900",
      "dark:bg-rose-950/30",
      "dark:text-rose-300",
    );
  } else if (type === "success") {
    statusBarEl.classList.add(
      "border-emerald-300",
      "bg-emerald-50",
      "text-emerald-700",
      "dark:border-emerald-900",
      "dark:bg-emerald-950/30",
      "dark:text-emerald-300",
    );
  } else {
    statusBarEl.classList.add(
      "border-slate-300",
      "bg-slate-50",
      "text-slate-700",
      "dark:border-slate-700",
      "dark:bg-slate-900/30",
      "dark:text-slate-300",
    );
  }

  state.retryAction = retryAction;
  if (statusRetryBtnEl) {
    if (retryAction) {
      statusRetryBtnEl.classList.remove("hidden");
    } else {
      statusRetryBtnEl.classList.add("hidden");
    }
  }

  if (state.statusTimer) {
    clearTimeout(state.statusTimer);
    state.statusTimer = null;
  }

  if (autoHideMs > 0) {
    state.statusTimer = setTimeout(() => {
      hideStatus();
    }, autoHideMs);
  }
}

function smoothScrollToBottom() {
  chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: "smooth" });
}

function uid() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function showTyping() {
  typingEl.classList.remove("hidden");
  typingEl.classList.add("flex");
}

function hideTyping() {
  typingEl.classList.add("hidden");
  typingEl.classList.remove("flex");
}

function createAvatar(role) {
  const avatar = document.createElement("div");
  avatar.className =
    role === "user"
      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white shadow-sm"
      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-sm";
  avatar.textContent = role === "user" ? "VOCE" : "IA";
  return avatar;
}

function appendMessage(role, content, options = {}) {
  const wrapper = document.createElement("div");
  wrapper.className =
    role === "user" ? "flex justify-end" : "flex justify-start";

  const row = document.createElement("div");
  row.className =
    role === "user"
      ? "flex max-w-[95%] items-end gap-2 sm:max-w-[80%]"
      : "flex max-w-[95%] items-end gap-2 sm:max-w-[85%]";

  const bubble = document.createElement("article");
  bubble.className =
    role === "user"
      ? "rounded-2xl rounded-br-md bg-gradient-to-br from-teal-600 to-teal-700 px-4 py-3 text-sm text-white shadow-lg shadow-teal-900/10 animate-bubble-in"
      : "rounded-2xl rounded-bl-md bg-white/40 px-4 py-3 text-sm text-slate-800 ring-1 ring-white/50 backdrop-blur-md shadow-sm animate-bubble-in dark:bg-slate-800/40 dark:text-slate-200 dark:ring-slate-700/50";

  const label = document.createElement("p");
  label.className =
    role === "user"
      ? "mb-1 text-[11px] font-semibold uppercase tracking-wide text-teal-100"
      : "mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
  label.textContent = role === "user" ? "Usuario" : "Assistente";

  const contentEl = document.createElement("div");
  contentEl.className = "whitespace-pre-wrap leading-relaxed";
  contentEl.textContent = content;

  bubble.appendChild(label);
  bubble.appendChild(contentEl);

  if (Array.isArray(options.images) && options.images.length > 0) {
    const gallery = document.createElement("div");
    gallery.className = "mt-2 grid grid-cols-2 gap-2";

    options.images.slice(0, 4).forEach((imageSrc, idx) => {
      const preview = document.createElement("img");
      preview.src = imageSrc;
      preview.alt = `Imagem enviada ${idx + 1}`;
      preview.className =
        "max-h-44 w-full rounded-lg border border-white/20 object-cover";
      gallery.appendChild(preview);
    });

    bubble.appendChild(gallery);
  }

  if (role === "assistant") {
    const actionsRow = document.createElement("div");
    actionsRow.className = "mt-2 flex flex-wrap gap-2";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className =
      "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700";
    copyBtn.textContent = "Copiar resposta";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(contentEl.textContent || "");
        copyBtn.textContent = "Copiado";
        setTimeout(() => {
          copyBtn.textContent = "Copiar resposta";
        }, 1200);
      } catch (err) {
        console.error(err);
      }
    });

    const speakBtn = document.createElement("button");
    speakBtn.type = "button";
    speakBtn.className =
      "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700";
    speakBtn.textContent = "Ouvir resposta";
    speakBtn.addEventListener("click", () => {
      const text = (contentEl.textContent || "").trim();
      if (!text) return;

      if (!("speechSynthesis" in window)) {
        speakBtn.textContent = "TTS indisponivel";
        setTimeout(() => {
          speakBtn.textContent = "Ouvir resposta";
        }, 1500);
        return;
      }

      const synthesis = window.speechSynthesis;
      if (synthesis.speaking) {
        synthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 1;
      utterance.pitch = 1;

      speakBtn.textContent = "Lendo...";
      utterance.onend = () => {
        speakBtn.textContent = "Ouvir resposta";
      };
      utterance.onerror = () => {
        speakBtn.textContent = "Falha ao ler";
        setTimeout(() => {
          speakBtn.textContent = "Ouvir resposta";
        }, 1200);
      };

      synthesis.speak(utterance);
    });

    actionsRow.appendChild(copyBtn);
    actionsRow.appendChild(speakBtn);
    bubble.appendChild(actionsRow);

    if (Array.isArray(options.sources) && options.sources.length > 0) {
      const citationsWrap = document.createElement("div");
      citationsWrap.className =
        "mt-2 rounded-lg border border-amber-200 bg-amber-50/70 px-2 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200";

      const title = document.createElement("p");
      title.className = "font-semibold uppercase tracking-wide";
      title.textContent = "Fontes";
      citationsWrap.appendChild(title);

      options.sources.forEach((source) => {
        const item = document.createElement("p");
        item.className = "mt-1 whitespace-pre-wrap";
        item.textContent = `${source.documentName}#trecho${source.chunkIndex}: ${source.snippet}`;
        citationsWrap.appendChild(item);
      });

      bubble.appendChild(citationsWrap);
    }
  }

  if (role === "user") {
    row.appendChild(bubble);
    row.appendChild(createAvatar(role));
  } else {
    row.appendChild(createAvatar(role));
    row.appendChild(bubble);
  }

  wrapper.appendChild(row);
  chatEl.appendChild(wrapper);
  smoothScrollToBottom();

  return contentEl;
}

function renderTabs() {
  tabsEl.innerHTML = "";
  if (tabsMobileEl) tabsMobileEl.innerHTML = "";

  state.chats.forEach((chat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      chat.id === state.activeChatId
        ? "w-full rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-left text-sm font-semibold text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-400"
        : "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700";

    const markers = [];
    if (chat.isFavorite) markers.push("★");
    if (chat.archivedAt) markers.push("📦");
    if (Array.isArray(chat.tags) && chat.tags.length > 0) {
      markers.push(`#${chat.tags[0]}`);
    }
    btn.textContent =
      `${markers.join(" ")} ${chat.title || "Nova conversa"}`.trim();
    btn.addEventListener("click", () => switchChat(chat.id));
    tabsEl.appendChild(btn);

    if (tabsMobileEl) {
      const compact = document.createElement("button");
      compact.type = "button";
      compact.className =
        chat.id === state.activeChatId
          ? "rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 whitespace-nowrap dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-400"
          : "rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
      compact.textContent = chat.isFavorite
        ? `★ ${chat.title || "Nova"}`
        : chat.title || "Nova";
      compact.addEventListener("click", () => switchChat(chat.id));
      tabsMobileEl.appendChild(compact);
    }
  });

  const activeChat = state.chats.find((chat) => chat.id === state.activeChatId);
  if (favoriteBtnEl) {
    favoriteBtnEl.textContent = activeChat?.isFavorite
      ? "Desfavoritar aba"
      : "Favoritar aba";
  }
  if (archiveBtnEl) {
    archiveBtnEl.textContent = activeChat?.archivedAt
      ? "Desarquivar aba"
      : "Arquivar aba";
  }
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const responseTraceId = response.headers.get("x-trace-id") || null;
  if (!response.ok) {
    let detail = "";
    let serverTraceId = responseTraceId;
    try {
      const data = await response.json();
      detail = data?.error || "";
      if (data?.traceId) serverTraceId = data.traceId;
    } catch {
      try {
        detail = await response.text();
      } catch {
        detail = "";
      }
    }

    const fallback = `Falha na requisicao (${response.status})`;
    const err = new Error((detail || fallback).trim());
    err.traceId = serverTraceId;
    err.status = response.status;
    throw err;
  }
  return response.json();
}

async function loadChats() {
  try {
    const query = buildChatsQueryString();
    const data = await fetchJson(`/api/chats?${query}`);
    state.chats = data.chats || [];

    if (!state.chats.length) {
      if (state.chatFilters.mode !== "archived" && !state.chatFilters.tag) {
        await createNewChat("Conversa Principal");
      } else {
        state.activeChatId = null;
        renderTabs();
        chatEl.innerHTML = "";
      }
      return;
    }

    if (
      !state.activeChatId ||
      !state.chats.some((chat) => chat.id === state.activeChatId)
    ) {
      state.activeChatId = state.chats[0].id;
    }

    renderTabs();
    await loadMessages(state.activeChatId);
    hideStatus();
  } catch (error) {
    showStatus(`Nao foi possivel carregar as conversas: ${error.message}`, {
      type: "error",
      retryAction: () => loadChats(),
    });
    throw error;
  }
}

async function loadMessages(chatId) {
  try {
    const data = await fetchJson(
      `/api/chats/${encodeURIComponent(chatId)}/messages`,
    );
    chatEl.innerHTML = "";
    for (const message of data.messages || []) {
      appendMessage(message.role, message.content, { images: message.images });
    }
    hideTyping();
    hideStatus();
  } catch (error) {
    showStatus(`Nao foi possivel carregar mensagens: ${error.message}`, {
      type: "error",
      retryAction: () => loadMessages(chatId),
    });
    throw error;
  }
}

async function switchChat(chatId) {
  state.activeChatId = chatId;
  renderTabs();
  await loadMessages(chatId);
  await loadRagDocuments();

  if (state.search.query) {
    await runHistorySearch({ resetPage: true });
  } else {
    clearSearchResults();
  }
}

async function createNewChat(title = "Nova conversa") {
  const id = uid();
  try {
    await fetchJson("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title, userId: state.userId }),
    });

    await loadChats();
    await switchChat(id);
    showStatus("Nova aba criada com sucesso.", { type: "success" });
  } catch (error) {
    showStatus(`Nao foi possivel criar nova aba: ${error.message}`, {
      type: "error",
      retryAction: () => createNewChat(title),
    });
    throw error;
  }
}

async function renameActiveChat() {
  if (!state.activeChatId) return;
  const current = state.chats.find((chat) => chat.id === state.activeChatId);
  const input = window.prompt(
    "Novo nome da aba:",
    current?.title || "Nova conversa",
  );
  if (input === null) return;

  const title = input.trim();
  if (!title) return;

  try {
    await fetchJson(`/api/chats/${encodeURIComponent(state.activeChatId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    await loadChats();
    showStatus("Aba renomeada com sucesso.", { type: "success" });
  } catch (error) {
    showStatus(`Nao foi possivel renomear aba: ${error.message}`, {
      type: "error",
      retryAction: () => renameActiveChat(),
    });
    throw error;
  }
}

async function toggleFavoriteActiveChat() {
  if (!state.activeChatId) return;
  const current = state.chats.find((chat) => chat.id === state.activeChatId);
  const next = !current?.isFavorite;

  try {
    await fetchJson(
      `/api/chats/${encodeURIComponent(state.activeChatId)}/favorite`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      },
    );
    await loadChats();
    showStatus(
      next ? "Aba marcada como favorita." : "Aba removida dos favoritos.",
      {
        type: "success",
        autoHideMs: 2500,
      },
    );
  } catch (error) {
    showStatus(`Nao foi possivel atualizar favorito: ${error.message}`, {
      type: "error",
    });
  }
}

async function toggleArchiveActiveChat() {
  if (!state.activeChatId) return;
  const current = state.chats.find((chat) => chat.id === state.activeChatId);
  const next = !current?.archivedAt;

  try {
    await fetchJson(
      `/api/chats/${encodeURIComponent(state.activeChatId)}/archive`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: next }),
      },
    );
    await loadChats();
    showStatus(next ? "Aba arquivada." : "Aba desarquivada.", {
      type: "success",
      autoHideMs: 2500,
    });
  } catch (error) {
    showStatus(`Nao foi possivel arquivar aba: ${error.message}`, {
      type: "error",
    });
  }
}

async function editTagsActiveChat() {
  if (!state.activeChatId) return;
  const current = state.chats.find((chat) => chat.id === state.activeChatId);
  const currentTags = Array.isArray(current?.tags)
    ? current.tags.join(", ")
    : "";
  const typed = window.prompt(
    "Tags da aba (separadas por virgula):",
    currentTags,
  );
  if (typed === null) return;

  const tags = typed
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);

  try {
    await fetchJson(
      `/api/chats/${encodeURIComponent(state.activeChatId)}/tags`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      },
    );
    await loadChats();
    showStatus("Tags atualizadas.", { type: "success", autoHideMs: 2500 });
  } catch (error) {
    showStatus(`Nao foi possivel atualizar tags: ${error.message}`, {
      type: "error",
    });
  }
}

async function editChatSystemPrompt() {
  if (!state.activeChatId) return;

  try {
    const promptData = await fetchJson(
      `/api/chats/${encodeURIComponent(state.activeChatId)}/system-prompt`,
    );
    const current = String(promptData.systemPrompt || "");
    const next = window.prompt(
      "Prompt de sistema desta conversa (vazio para remover):",
      current,
    );
    if (next === null) return;

    await fetchJson(
      `/api/chats/${encodeURIComponent(state.activeChatId)}/system-prompt`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: String(next || "") }),
      },
    );

    await loadChats();
    showStatus("Prompt da conversa atualizado.", { type: "success" });
  } catch (error) {
    showStatus(`Falha ao atualizar prompt da conversa: ${error.message}`, {
      type: "error",
    });
  }
}

async function editUserDefaultSystemPrompt() {
  const currentUser = (state.users || []).find((u) => u.id === state.userId);
  const current = String(currentUser?.defaultSystemPrompt || "");
  const next = window.prompt(
    "Prompt padrao do perfil (vazio para remover):",
    current,
  );
  if (next === null) return;

  try {
    await fetchJson(
      `/api/users/${encodeURIComponent(state.userId)}/system-prompt-default`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultSystemPrompt: String(next || "") }),
      },
    );

    await loadUsers();
    showStatus("Prompt padrao do perfil atualizado.", { type: "success" });
  } catch (error) {
    showStatus(`Falha ao atualizar prompt do perfil: ${error.message}`, {
      type: "error",
    });
  }
}

async function duplicateActiveChat() {
  if (!state.activeChatId) return;

  const current = state.chats.find((chat) => chat.id === state.activeChatId);
  const defaultTitle = `${current?.title || "Conversa"} (copia)`;
  const modalResult = await openDuplicateModal(defaultTitle);
  if (!modalResult) return;

  const title = modalResult.title;
  const id = uid();
  const userOnly = modalResult.userOnly;

  try {
    const payload = await fetchJson(
      `/api/chats/${encodeURIComponent(state.activeChatId)}/duplicate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title, userOnly }),
      },
    );

    await loadChats();
    await switchChat(payload.chat.id);
    showStatus("Aba duplicada com sucesso.", { type: "success" });
  } catch (error) {
    showStatus(`Nao foi possivel duplicar aba: ${error.message}`, {
      type: "error",
      retryAction: () => duplicateActiveChat(),
    });
    throw error;
  }
}

function getFocusableElements(element) {
  return Array.from(
    element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled"));
}

function handleModalKeydown(e) {
  if (e.key !== "Tab") return;

  const focusableElements = getFocusableElements(duplicateModalEl);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (e.shiftKey) {
    if (activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    }
  } else {
    if (activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
}

function closeDuplicateModal(result = null) {
  duplicateModalEl.classList.add("modal-exit-active");
  duplicateModalEl.removeEventListener("keydown", handleModalKeydown);

  setTimeout(() => {
    duplicateModalEl.classList.remove("modal-exit-active");
    duplicateModalEl.classList.add("hidden");
    duplicateModalEl.classList.remove("flex");

    if (state.duplicateResolver) {
      const resolve = state.duplicateResolver;
      state.duplicateResolver = null;
      resolve(result);
    }
  }, 250);
}

function openDuplicateModal(defaultTitle) {
  duplicateTitleInputEl.value = defaultTitle;
  duplicateModeFullEl.checked = true;
  duplicateModeUserEl.checked = false;

  duplicateModalEl.classList.remove("hidden");
  duplicateModalEl.classList.add("flex");
  duplicateModalEl.classList.add("modal-enter-active");

  duplicateModalEl.addEventListener("keydown", handleModalKeydown);

  setTimeout(() => {
    duplicateModalEl.classList.remove("modal-enter-active");
    duplicateTitleInputEl.focus();
    duplicateTitleInputEl.select();
  }, 0);

  return new Promise((resolve) => {
    state.duplicateResolver = resolve;
  });
}

async function deleteActiveChat() {
  if (!state.activeChatId) return;
  const currentId = state.activeChatId;
  const confirmed = await openConfirmModal(
    "Deseja excluir esta aba e todas as mensagens?",
  );
  if (!confirmed) return;

  try {
    await fetchJson(`/api/chats/${encodeURIComponent(currentId)}`, {
      method: "DELETE",
    });

    await loadChats();
    showStatus("Aba excluida com sucesso.", { type: "success" });
  } catch (error) {
    showStatus(`Nao foi possivel excluir aba: ${error.message}`, {
      type: "error",
      retryAction: () => deleteActiveChat(),
    });
    throw error;
  }
}

function getControls() {
  const temp = Number.parseFloat(document.getElementById("temp").value);
  const model = document.getElementById("modelo").value;
  const context = Number.parseInt(document.getElementById("ctx").value, 10);

  return {
    temperature: Number.isFinite(temp) ? temp : 0.7,
    model: model || "meu-llama3",
    context: Number.isFinite(context) ? context : 2048,
  };
}

async function imageToBase64(file) {
  if (!file) return null;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      const base64 = value.includes(",") ? value.split(",")[1] : value;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Falha ao converter imagem"));
    reader.readAsDataURL(file);
  });
}

async function filesToBase64(files) {
  const list = Array.isArray(files) ? files : [];
  const converted = await Promise.all(
    list.map(async (file) => {
      const base64 = await imageToBase64(file);
      return {
        base64,
        mimeType: file.type || "image/*",
      };
    }),
  );

  return converted.filter((item) => Boolean(item.base64));
}

async function enviar() {
  const texto = inputEl.value.trim();
  if (!texto) return;

  if (!state.activeChatId) {
    await createNewChat();
  }

  inputEl.value = "";
  inputEl.focus();
  updateSendButtonState();
  sendBtnEl.disabled = true;

  const selectedFiles = Array.from(imageInputEl.files || []).slice(0, 4);
  const encodedImages = await filesToBase64(selectedFiles);
  const imagePayload = encodedImages.map((item) => item.base64);
  const previewImages = encodedImages.map(
    (item) => `data:${item.mimeType};base64,${item.base64}`,
  );
  imageInputEl.value = "";

  appendMessage("user", texto, {
    images: previewImages,
  });
  const iaSpan = appendMessage("assistant", "");
  showTyping();

  try {
    const { temperature, model, context } = getControls();
    const ragEnabled = Boolean(ragToggleEl?.checked) && state.rag.docCount > 0;

    if (ragEnabled) {
      const payload = await fetchJson("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: state.activeChatId,
          message: texto,
          temperature,
          model,
          context,
          images: imagePayload,
          ragEnabled: true,
          ragTopK: 3,
        }),
      });

      iaSpan.textContent = payload.reply || "";
      if (Array.isArray(payload.citations) && payload.citations.length > 0) {
        const wrapper = iaSpan.parentElement;
        if (wrapper) {
          const refs = document.createElement("p");
          refs.className = "mt-2 text-xs text-amber-700 dark:text-amber-300";
          refs.textContent = `Fontes: ${payload.citations.map((item) => `${item.documentName}#trecho${item.chunkIndex}`).join(", ")}`;
          wrapper.appendChild(refs);
        }
      }

      await loadChats();
      hideStatus();
      return;
    }

    const response = await fetch(`${API_BASE}/api/chat-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: state.activeChatId,
        message: texto,
        temperature,
        model,
        context,
        images: imagePayload,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error("Falha na resposta do servidor");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      iaSpan.textContent += chunk;
      smoothScrollToBottom();
    }

    await loadChats();
    hideStatus();
  } catch (error) {
    iaSpan.textContent =
      "Nao foi possivel gerar resposta agora. Tente novamente.";
    showStatus(`Falha ao gerar resposta: ${error.message}`, {
      type: "error",
      retryAction: async () => {
        try {
          showTyping();
          iaSpan.textContent = "";

          const response = await fetch(`${API_BASE}/api/chat-stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId: state.activeChatId,
              message: texto,
              temperature: getControls().temperature,
              model: getControls().model,
              context: getControls().context,
              images: imagePayload,
            }),
          });

          if (!response.ok || !response.body) {
            throw new Error("Falha na resposta do servidor");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            iaSpan.textContent += decoder.decode(value, { stream: true });
            smoothScrollToBottom();
          }

          await loadChats();
          hideStatus();
        } catch (retryError) {
          iaSpan.textContent =
            "Nao foi possivel gerar resposta agora. Tente novamente.";
          showStatus(`Falha ao tentar novamente: ${retryError.message}`, {
            type: "error",
            retryAction: state.retryAction,
          });
        } finally {
          hideTyping();
          sendBtnEl.disabled = false;
        }
      },
    });
    console.error(error);
  } finally {
    hideTyping();
    sendBtnEl.disabled = false;
  }
}

async function resetar() {
  if (!state.activeChatId) return;

  const confirmed = await openConfirmModal(
    "Tem certeza que deseja limpar todo o historico desta conversa?",
  );
  if (!confirmed) return;

  try {
    await fetchJson(
      `/api/chats/${encodeURIComponent(state.activeChatId)}/reset`,
      { method: "POST" },
    );
    chatEl.innerHTML = "";
    hideTyping();
    await loadChats();
    showStatus("Conversa limpa com sucesso.", { type: "success" });
  } catch (error) {
    showStatus(`Nao foi possivel limpar conversa: ${error.message}`, {
      type: "error",
      retryAction: () => resetar(),
    });
    throw error;
  }
}

async function exportChat() {
  if (!state.activeChatId) return;

  try {
    const response = await fetch(
      `${API_BASE}/api/chats/${encodeURIComponent(state.activeChatId)}/export`,
    );
    if (!response.ok) {
      throw new Error("Falha ao exportar conversa");
    }

    const markdown = await response.text();
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${state.activeChatId}.md`;
    anchor.click();

    URL.revokeObjectURL(url);
    showStatus("Conversa exportada com sucesso.", { type: "success" });
  } catch (error) {
    showStatus(`Nao foi possivel exportar conversa: ${error.message}`, {
      type: "error",
      retryAction: () => exportChat(),
    });
    throw error;
  }
}

async function exportChatJson() {
  if (!state.activeChatId) return;

  try {
    const response = await fetch(
      `${API_BASE}/api/chats/${encodeURIComponent(state.activeChatId)}/export?format=json`,
    );
    if (!response.ok) {
      throw new Error("Falha ao exportar conversa em JSON");
    }

    const jsonText = await response.text();
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${state.activeChatId}.json`;
    anchor.click();

    URL.revokeObjectURL(url);
    showStatus("Conversa exportada em JSON com sucesso.", { type: "success" });
  } catch (error) {
    showStatus(`Nao foi possivel exportar JSON: ${error.message}`, {
      type: "error",
      retryAction: () => exportChatJson(),
    });
    throw error;
  }
}

async function importChatJson() {
  try {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";

    const file = await new Promise((resolve) => {
      input.addEventListener(
        "change",
        () => resolve(input.files?.[0] || null),
        {
          once: true,
        },
      );
      input.click();
    });

    if (!file) return;
    const raw = await file.text();
    const payload = JSON.parse(raw);

    const imported = await fetchJson("/api/chats/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    await loadChats();
    if (imported?.chat?.id) {
      state.activeChatId = imported.chat.id;
      await loadMessages();
    }

    showStatus("Conversa importada com sucesso.", { type: "success" });
  } catch (error) {
    showStatus(`Nao foi possivel importar JSON: ${error.message}`, {
      type: "error",
      retryAction: () => importChatJson(),
    });
    throw error;
  }
}

async function exportAllChatsJson() {
  try {
    const response = await fetch(
      `${API_BASE}/api/chats/export?userId=${encodeURIComponent(state.userId)}`,
    );
    if (!response.ok) {
      throw new Error("Falha ao exportar lote de conversas");
    }

    const jsonText = await response.text();
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `chats-${state.userId}.json`;
    anchor.click();

    URL.revokeObjectURL(url);
    showStatus("Conversas exportadas em lote com sucesso.", {
      type: "success",
    });
  } catch (error) {
    showStatus(`Nao foi possivel exportar lote: ${error.message}`, {
      type: "error",
      retryAction: () => exportAllChatsJson(),
    });
    throw error;
  }
}

async function exportFullBackup() {
  try {
    const response = await fetch(`${API_BASE}/api/backup/export`);
    if (!response.ok) {
      throw new Error("Falha ao gerar backup");
    }

    const blob = await response.blob();
    const header = String(response.headers.get("content-disposition") || "");
    const match = header.match(/filename="?([^";]+)"?/i);
    const fileName = match?.[1] || `meu-chat-local-backup-${Date.now()}.tgz`;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);

    showStatus("Backup completo exportado com sucesso.", {
      type: "success",
      autoHideMs: 3000,
    });
  } catch (error) {
    showStatus(`Nao foi possivel exportar backup: ${error.message}`, {
      type: "error",
      retryAction: () => exportFullBackup(),
    });
    throw error;
  }
}

async function pickBackupFile() {
  if (!backupRestoreInputEl) return null;

  backupRestoreInputEl.value = "";
  const file = await new Promise((resolve) => {
    backupRestoreInputEl.addEventListener(
      "change",
      () => resolve(backupRestoreInputEl.files?.[0] || null),
      { once: true },
    );
    backupRestoreInputEl.click();
  });

  return file;
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.onload = () => {
      const raw = String(reader.result || "");
      const base64 = raw.includes(",") ? raw.split(",")[1] : "";
      if (!base64) {
        reject(new Error("Arquivo de backup invalido"));
        return;
      }
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

async function restoreFullBackup() {
  const confirmed = await openConfirmModal(
    "Restaurar backup ira substituir o banco atual. Deseja continuar?",
  );
  if (!confirmed) return;

  try {
    const file = await pickBackupFile();
    if (!file) return;

    const archiveBase64 = await fileToBase64(file);
    await fetchJson("/api/backup/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archiveBase64 }),
    });

    await loadUsers();
    await loadChats();
    await loadRagDocuments();

    showStatus("Backup restaurado com sucesso.", {
      type: "success",
      autoHideMs: 3500,
    });
  } catch (error) {
    showStatus(`Nao foi possivel restaurar backup: ${error.message}`, {
      type: "error",
      retryAction: () => restoreFullBackup(),
    });
    throw error;
  }
}

function setupVoiceInput() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceBtnEl.disabled = true;
    voiceBtnEl.textContent = "Voz indisponivel neste navegador";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      transcript += event.results[i][0].transcript;
    }
    inputEl.value = transcript.trim();

    if (event.results[0].isFinal) {
      saveVoiceHistory(transcript.trim());
    }
  };

  recognition.onstart = () => {
    state.isListening = true;
    voiceBtnEl.textContent = "Parar ditado";
  };

  recognition.onend = () => {
    state.isListening = false;
    voiceBtnEl.textContent = "Iniciar ditado";
  };

  state.recognition = recognition;

  voiceBtnEl.addEventListener("click", () => {
    if (!state.recognition) return;

    if (state.isListening) {
      state.recognition.stop();
      return;
    }

    state.recognition.start();
  });
}

function saveVoiceHistory(text) {
  if (!text || text.length < 2) return;

  // Evitar duplicatas consecutivas
  if (state.voiceHistory[0] === text) return;

  state.voiceHistory.unshift(text);
  if (state.voiceHistory.length > 50) {
    state.voiceHistory.pop();
  }

  localStorage.setItem("voiceHistory", JSON.stringify(state.voiceHistory));
}

function loadVoiceHistory() {
  const saved = localStorage.getItem("voiceHistory");
  if (saved) {
    try {
      state.voiceHistory = JSON.parse(saved);
    } catch {
      state.voiceHistory = [];
    }
  }
}

function renderVoiceHistory() {
  voiceHistoryListEl.innerHTML = "";

  if (state.voiceHistory.length === 0) {
    voiceHistoryListEl.innerHTML =
      '<p class="py-8 text-center text-sm text-slate-400 italic">Nenhuma transcricao salva ainda.</p>';
    return;
  }

  state.voiceHistory.forEach((text) => {
    const container = document.createElement("div");
    container.className =
      "group relative flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:bg-teal-50 hover:border-teal-200 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-teal-950/30 dark:hover:border-teal-900";

    const textEl = document.createElement("p");
    textEl.className =
      "line-clamp-2 text-sm text-slate-700 cursor-pointer dark:text-slate-300";
    textEl.textContent = text;
    textEl.addEventListener("click", () => {
      inputEl.value = text;
      updateSendButtonState();
      closeVoiceHistoryModal();
      inputEl.focus();
    });

    const controls = document.createElement("div");
    controls.className = "flex justify-end gap-2";

    if (text.length > 60) {
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className =
        "text-[10px] font-bold uppercase tracking-wider text-teal-600 hover:underline";
      toggleBtn.textContent = "Expandir";
      toggleBtn.addEventListener("click", () => {
        if (textEl.classList.contains("line-clamp-2")) {
          textEl.classList.remove("line-clamp-2");
          toggleBtn.textContent = "Recolher";
        } else {
          textEl.classList.add("line-clamp-2");
          toggleBtn.textContent = "Expandir";
        }
      });
      controls.appendChild(toggleBtn);
    }

    container.appendChild(textEl);
    container.appendChild(controls);
    voiceHistoryListEl.appendChild(container);
  });
}

function openVoiceHistoryModal() {
  renderVoiceHistory();
  voiceHistoryModalEl.classList.remove("hidden");
  voiceHistoryModalEl.classList.add("flex");
}

function closeVoiceHistoryModal() {
  voiceHistoryModalEl.classList.add("hidden");
  voiceHistoryModalEl.classList.remove("flex");
}

function updateSendButtonState() {
  sendBtnEl.disabled = inputEl.value.trim() === "";
}

function openConfirmModal(text) {
  confirmModalTextEl.textContent = text;
  confirmModalEl.classList.remove("hidden");
  confirmModalEl.classList.add("flex");

  return new Promise((resolve) => {
    state.confirmResolver = resolve;
  });
}

function closeConfirmModal(result) {
  confirmModalEl.classList.add("hidden");
  confirmModalEl.classList.remove("flex");
  if (state.confirmResolver) {
    const resolve = state.confirmResolver;
    state.confirmResolver = null;
    resolve(result);
  }
}

function isTextInputLike(element) {
  if (!element) return false;
  const tag = String(element.tagName || "").toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    element.isContentEditable === true
  );
}

function focusSearchField() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;
  searchInput.focus();
  searchInput.select?.();
}

function openShortcutsModal() {
  if (!shortcutsModalEl) return;
  shortcutsModalEl.classList.remove("hidden");
  shortcutsModalEl.classList.add("flex");
  shortcutsCloseBtnEl?.focus();
}

function closeShortcutsModal() {
  if (!shortcutsModalEl) return;
  shortcutsModalEl.classList.add("hidden");
  shortcutsModalEl.classList.remove("flex");
}

function isShortcutsModalOpen() {
  return shortcutsModalEl && !shortcutsModalEl.classList.contains("hidden");
}

function navigateToTabByNumber(numericShortcut) {
  const index = numericShortcut - 1;
  if (index < 0 || index > 8) return;
  const chat = state.chats[index];
  if (!chat?.id) return;
  switchChat(chat.id).catch(console.error);
}

function handleGlobalShortcuts(event) {
  const key = String(event.key || "").toLowerCase();
  const usesCtrl = event.ctrlKey || event.metaKey;

  if (event.key === "Escape") {
    if (isShortcutsModalOpen()) {
      event.preventDefault();
      closeShortcutsModal();
      return;
    }
    if (state.duplicateResolver) {
      event.preventDefault();
      closeDuplicateModal(null);
      return;
    }
    if (state.confirmResolver) {
      event.preventDefault();
      closeConfirmModal(false);
      return;
    }
    if (voiceHistoryModalEl && !voiceHistoryModalEl.classList.contains("hidden")) {
      event.preventDefault();
      closeVoiceHistoryModal();
      return;
    }
    if (onboardingModalEl && !onboardingModalEl.classList.contains("hidden")) {
      event.preventDefault();
      closeOnboardingModal();
    }
    return;
  }

  if (!usesCtrl) {
    if (event.key === "?" && !isTextInputLike(event.target)) {
      event.preventDefault();
      openShortcutsModal();
    }
    return;
  }

  if (key === "k" || key === "f") {
    event.preventDefault();
    focusSearchField();
    return;
  }

  if (key === "n") {
    event.preventDefault();
    createNewChat();
    return;
  }

  if (key === "d") {
    event.preventDefault();
    duplicateActiveChat().catch(console.error);
    return;
  }

  if (key === "w") {
    event.preventDefault();
    deleteActiveChat().catch(console.error);
    return;
  }

  if (/^[1-9]$/.test(key)) {
    event.preventDefault();
    navigateToTabByNumber(Number.parseInt(key, 10));
  }
}

function setupDragAndDrop() {
  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    window.addEventListener(eventName, preventDefaults, false);
  });

  window.addEventListener(
    "drop",
    (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;

      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("image/")) {
          imageInputEl.files = files;
          // Feedback visual ou trigger de upload se necessário
          console.log("Imagem anexada via drag and drop:", file.name);
        }
      }
    },
    false,
  );
}

function loadDarkMode() {
  const saved = normalizeThemeMode(localStorage.getItem("themeMode") || "system");
  applyThemeMode(saved, { persistLocal: false });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (state.themeMode === "system") {
        applyThemeMode("system", { persistLocal: false });
      }
    });
}

inputEl.addEventListener("input", updateSendButtonState);

inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    enviar();
  }
});

document.addEventListener("keydown", handleGlobalShortcuts);

if (duplicateModalEl) {
  duplicateModalEl.addEventListener("click", (event) => {
    if (event.target === duplicateModalEl) {
      closeDuplicateModal(null);
    }
  });
}

if (duplicateCancelBtnEl) {
  duplicateCancelBtnEl.addEventListener("click", () => {
    closeDuplicateModal(null);
  });
}

if (duplicateConfirmBtnEl) {
  duplicateConfirmBtnEl.addEventListener("click", () => {
    const typed = duplicateTitleInputEl.value.trim();
    const title = typed || "Conversa (copia)";
    const userOnly = duplicateModeUserEl.checked;
    closeDuplicateModal({ title, userOnly });
  });
}

if (newChatBtnEl) {
  newChatBtnEl.addEventListener("click", () => {
    createNewChat();
  });
}

if (newChatBtnMobileEl) {
  newChatBtnMobileEl.addEventListener("click", () => {
    createNewChat();
  });
}

if (renameBtnEl) {
  renameBtnEl.addEventListener("click", () => {
    renameActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (favoriteBtnEl) {
  favoriteBtnEl.addEventListener("click", () => {
    toggleFavoriteActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (archiveBtnEl) {
  archiveBtnEl.addEventListener("click", () => {
    toggleArchiveActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (tagsBtnEl) {
  tagsBtnEl.addEventListener("click", () => {
    editTagsActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (systemPromptBtnEl) {
  systemPromptBtnEl.addEventListener("click", () => {
    editChatSystemPrompt().catch((err) => {
      console.error(err);
    });
  });
}

if (duplicateBtnEl) {
  duplicateBtnEl.addEventListener("click", () => {
    duplicateActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (deleteBtnEl) {
  deleteBtnEl.addEventListener("click", () => {
    deleteActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (renameBtnMobileEl) {
  renameBtnMobileEl.addEventListener("click", () => {
    renameActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (duplicateBtnMobileEl) {
  duplicateBtnMobileEl.addEventListener("click", () => {
    duplicateActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (deleteBtnMobileEl) {
  deleteBtnMobileEl.addEventListener("click", () => {
    deleteActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (exportBtnEl) {
  exportBtnEl.addEventListener("click", () => {
    exportChat().catch((err) => {
      console.error(err);
    });
  });
}

if (exportBtnMobileEl) {
  exportBtnMobileEl.addEventListener("click", () => {
    exportChat().catch((err) => {
      console.error(err);
    });
  });
}

if (exportJsonBtnEl) {
  exportJsonBtnEl.addEventListener("click", () => {
    exportChatJson().catch((err) => {
      console.error(err);
    });
  });
}

if (exportJsonBtnMobileEl) {
  exportJsonBtnMobileEl.addEventListener("click", () => {
    exportChatJson().catch((err) => {
      console.error(err);
    });
  });
}

if (importJsonBtnEl) {
  importJsonBtnEl.addEventListener("click", () => {
    importChatJson().catch((err) => {
      console.error(err);
    });
  });
}

if (importJsonBtnMobileEl) {
  importJsonBtnMobileEl.addEventListener("click", () => {
    importChatJson().catch((err) => {
      console.error(err);
    });
  });
}

if (exportAllJsonBtnEl) {
  exportAllJsonBtnEl.addEventListener("click", () => {
    exportAllChatsJson().catch((err) => {
      console.error(err);
    });
  });
}

if (exportAllJsonBtnMobileEl) {
  exportAllJsonBtnMobileEl.addEventListener("click", () => {
    exportAllChatsJson().catch((err) => {
      console.error(err);
    });
  });
}

if (backupBtnEl) {
  backupBtnEl.addEventListener("click", () => {
    exportFullBackup().catch(console.error);
  });
}

if (backupBtnMobileEl) {
  backupBtnMobileEl.addEventListener("click", () => {
    exportFullBackup().catch(console.error);
  });
}

if (restoreBackupBtnEl) {
  restoreBackupBtnEl.addEventListener("click", () => {
    restoreFullBackup().catch(console.error);
  });
}

if (restoreBackupBtnMobileEl) {
  restoreBackupBtnMobileEl.addEventListener("click", () => {
    restoreFullBackup().catch(console.error);
  });
}

if (voiceHistoryBtnEl) {
  voiceHistoryBtnEl.addEventListener("click", openVoiceHistoryModal);
}

if (voiceHistoryCloseBtnEl) {
  voiceHistoryCloseBtnEl.addEventListener("click", closeVoiceHistoryModal);
}

if (voiceHistoryModalEl) {
  voiceHistoryModalEl.addEventListener("click", (e) => {
    if (e.target === voiceHistoryModalEl) closeVoiceHistoryModal();
  });
}

if (clearVoiceHistoryBtnEl) {
  clearVoiceHistoryBtnEl.addEventListener("click", async () => {
    const confirmed = await openConfirmModal(
      "Deseja limpar todo o historico de voz?",
    );
    if (confirmed) {
      state.voiceHistory = [];
      localStorage.removeItem("voiceHistory");
      renderVoiceHistory();
    }
  });
}

if (confirmCancelBtnEl) {
  confirmCancelBtnEl.addEventListener("click", () => closeConfirmModal(false));
}

if (confirmOkBtnEl) {
  confirmOkBtnEl.addEventListener("click", () => closeConfirmModal(true));
}

if (confirmModalEl) {
  confirmModalEl.addEventListener("click", (e) => {
    if (e.target === confirmModalEl) closeConfirmModal(false);
  });
}

if (darkModeBtnEl) {
  darkModeBtnEl.addEventListener("click", async () => {
    const nextTheme = cycleThemeMode();
    try {
      await saveThemeForCurrentUser(nextTheme);
      showStatus(`Tema atualizado: ${nextTheme}.`, {
        type: "success",
        autoHideMs: 1800,
      });
    } catch (error) {
      showStatus(`Falha ao salvar tema do perfil: ${error.message}`, {
        type: "error",
      });
    }
  });
}

if (onboardingBtnEl) {
  onboardingBtnEl.addEventListener("click", () => {
    openOnboardingModal();
  });
}

if (onboardingRunChecksBtnEl) {
  onboardingRunChecksBtnEl.addEventListener("click", () => {
    runOnboardingChecks().catch((error) => {
      showStatus(`Falha no onboarding: ${error.message}`, { type: "error" });
      console.error(error);
    });
  });
}

if (onboardingSkipBtnEl) {
  onboardingSkipBtnEl.addEventListener("click", () => {
    closeOnboardingModal();
  });
}

if (onboardingCompleteBtnEl) {
  onboardingCompleteBtnEl.addEventListener("click", () => {
    const selectedModel = onboardingModelSelectEl?.value || "";
    const modelSelect = document.getElementById("modelo");
    if (modelSelect && selectedModel) {
      modelSelect.value = selectedModel;
      savePreferredModel(selectedModel);
    }

    localStorage.setItem("onboardingDone", "true");
    closeOnboardingModal();

    if (state.onboardingChecksOk) {
      showStatus("Assistente inicial concluido.", { type: "success" });
    } else {
      showStatus("Preferencias salvas. Rode a verificacao quando quiser.", {
        type: "info",
        autoHideMs: 3500,
      });
    }
  });
}

if (onboardingModalEl) {
  onboardingModalEl.addEventListener("click", (event) => {
    if (event.target === onboardingModalEl) {
      closeOnboardingModal();
    }
  });
}

if (shortcutsHelpBtnEl) {
  shortcutsHelpBtnEl.addEventListener("click", () => {
    openShortcutsModal();
  });
}

if (shortcutsCloseBtnEl) {
  shortcutsCloseBtnEl.addEventListener("click", () => {
    closeShortcutsModal();
  });
}

if (shortcutsModalEl) {
  shortcutsModalEl.addEventListener("click", (event) => {
    if (event.target === shortcutsModalEl) {
      closeShortcutsModal();
    }
  });
}

if (statusRetryBtnEl) {
  statusRetryBtnEl.addEventListener("click", async () => {
    if (!state.retryAction) return;
    const action = state.retryAction;
    try {
      await action();
    } catch (error) {
      console.error(error);
    }
  });
}

if (searchBtnEl) {
  searchBtnEl.addEventListener("click", () => {
    runHistorySearch({ resetPage: true }).catch((error) => {
      console.error(error);
    });
  });
}

if (searchInputEl) {
  searchInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runHistorySearch({ resetPage: true }).catch((error) => {
        console.error(error);
      });
    }
  });
}

if (searchClearBtnEl) {
  searchClearBtnEl.addEventListener("click", () => {
    if (searchInputEl) searchInputEl.value = "";
    if (searchRoleEl) searchRoleEl.value = "all";
    if (searchFromEl) searchFromEl.value = "";
    if (searchToEl) searchToEl.value = "";
    state.search.query = "";
    clearSearchResults();
  });
}

if (searchPrevBtnEl) {
  searchPrevBtnEl.addEventListener("click", () => {
    if (state.search.page <= 1) return;
    state.search.page -= 1;
    runHistorySearch({ resetPage: false }).catch((error) => {
      console.error(error);
    });
  });
}

if (searchNextBtnEl) {
  searchNextBtnEl.addEventListener("click", () => {
    if (
      state.search.totalPages === 0 ||
      state.search.page >= state.search.totalPages
    )
      return;
    state.search.page += 1;
    runHistorySearch({ resetPage: false }).catch((error) => {
      console.error(error);
    });
  });
}

if (docUploadBtnEl) {
  docUploadBtnEl.addEventListener("click", () => {
    uploadRagDocuments().catch((error) => {
      console.error(error);
    });
  });
}

if (ragToggleEl) {
  ragToggleEl.addEventListener("change", () => {
    state.rag.enabled = Boolean(ragToggleEl.checked);
    if (state.rag.enabled && state.rag.docCount === 0) {
      showStatus("RAG ativado, mas ainda sem documentos indexados nesta aba.", {
        type: "info",
        autoHideMs: 3000,
      });
    }
  });
}

if (userSelectEl) {
  userSelectEl.addEventListener("change", () => {
    const selected = userSelectEl.value;
    if (selected && selected !== state.userId) {
      switchUser(selected).catch(console.error);
    }
  });
}

if (newUserBtnEl) {
  newUserBtnEl.addEventListener("click", () => {
    createProfile().catch(console.error);
  });
}

if (renameUserBtnEl) {
  renameUserBtnEl.addEventListener("click", () => {
    renameCurrentProfile().catch(console.error);
  });
}

if (deleteUserBtnEl) {
  deleteUserBtnEl.addEventListener("click", () => {
    deleteCurrentProfile().catch(console.error);
  });
}

if (userPromptBtnEl) {
  userPromptBtnEl.addEventListener("click", () => {
    editUserDefaultSystemPrompt().catch(console.error);
  });
}

if (filterAllBtnEl) {
  filterAllBtnEl.addEventListener("click", () => {
    setFilterMode("all").catch(console.error);
  });
}

if (filterFavoritesBtnEl) {
  filterFavoritesBtnEl.addEventListener("click", () => {
    setFilterMode("favorites").catch(console.error);
  });
}

if (filterArchivedBtnEl) {
  filterArchivedBtnEl.addEventListener("click", () => {
    setFilterMode("archived").catch(console.error);
  });
}

if (filterTagApplyBtnEl) {
  filterTagApplyBtnEl.addEventListener("click", () => {
    state.chatFilters.tag = (filterTagInputEl?.value || "").trim();
    loadChats().catch(console.error);
  });
}

if (filterTagInputEl) {
  filterTagInputEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    state.chatFilters.tag = (filterTagInputEl.value || "").trim();
    loadChats().catch(console.error);
  });
}

if (telemetryOptInEl) {
  telemetryOptInEl.addEventListener("change", () => {
    setTelemetryEnabled(telemetryOptInEl.checked).catch(console.error);
  });
}

if (telemetryStatsBtnEl) {
  telemetryStatsBtnEl.addEventListener("click", () => {
    showTelemetryStats().catch(console.error);
  });
}

if (auditExportBtnEl) {
  auditExportBtnEl.addEventListener("click", () => {
    exportAuditLogsJson().catch(console.error);
  });
}

if (configHistoryBtnEl) {
  configHistoryBtnEl.addEventListener("click", () => {
    openConfigHistoryRollback().catch((error) => {
      showStatus(`Falha no rollback de configuracao: ${error.message}`, {
        type: "error",
        traceId: error.traceId,
      });
    });
  });
}

if (diagnosticsExportBtnEl) {
  diagnosticsExportBtnEl.addEventListener("click", () => {
    exportDiagnosticsPackage().catch((error) => {
      showStatus(`Falha ao exportar diagnostico: ${error.message}`, {
        type: "error",
        traceId: error.traceId,
      });
    });
  });
}

if (healthRefreshBtnEl) {
  healthRefreshBtnEl.addEventListener("click", () => {
    checkOllamaStatus().catch(console.error);
  });
}

if (storageRefreshBtnEl) {
  storageRefreshBtnEl.addEventListener("click", () => {
    loadStorageUsage().catch(console.error);
  });
}

if (storageCleanupBtnEl) {
  storageCleanupBtnEl.addEventListener("click", () => {
    runStorageCleanup().catch((error) => {
      showStatus(`Falha na limpeza: ${error.message}`, { type: "error" });
    });
  });
}

if (storageLimitBtnEl) {
  storageLimitBtnEl.addEventListener("click", () => {
    updateStorageLimitForCurrentUser().catch((error) => {
      showStatus(`Falha ao atualizar limite: ${error.message}`, {
        type: "error",
      });
    });
  });
}

window.enviar = enviar;
window.resetar = resetar;

(async function bootstrap() {
  loadDarkMode();
  applyPreferredModel();
  loadVoiceHistory();
  setupVoiceInput();
  setupDragAndDrop();
  updateSendButtonState();
  updateFilterUi();
  renderStorageUsage();
  try {
    await loadTelemetryState();
    await checkOllamaStatus();
    await loadUsers();
    await loadChats();
    await loadRagDocuments();
  } catch (error) {
    console.error(error);
  }

  // Polling de status do Ollama a cada 30s
  state.ollamaPollingTimer = setInterval(() => {
    checkOllamaStatus().catch(() => {});
  }, 30_000);

  if (localStorage.getItem("onboardingDone") !== "true") {
    openOnboardingModal();
  }
})();
