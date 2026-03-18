import { createApiClient } from "./app/shared/api.js";
import { escapeRegExp, formatBytes, formatDateLabel } from "./app/shared/format.js";
import { filesToBase64, filesToDocuments, readFileAsBase64 } from "./app/shared/files.js";
import { createModalPresenter } from "./app/shared/modal.js";
import { createShortcutsController } from "./app/shared/shortcuts.js";
import { createStatusPresenter } from "./app/shared/status.js";
import { isDarkForMode, normalizeThemeMode } from "./app/shared/theme.js";
import { buildHeaderPresentation, createHealthPoller } from "./health-indicators.js";

const API_BASE = window.location.origin;
const { fetchJson } = createApiClient({ baseUrl: API_BASE });

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("msg");
const typingEl = document.getElementById("typing");
const sendBtnEl = document.getElementById("sendBtn");
const tabsEl = document.getElementById("chatTabs");
const newChatBtnEl = document.getElementById("newChatBtn");
const exportBtnEl = document.getElementById("exportBtn");
const exportJsonBtnEl = document.getElementById("exportJsonBtn");
const exportAllJsonBtnEl = document.getElementById("exportAllJsonBtn");
const exportFavoritesMdBtnEl = document.getElementById("exportFavoritesMdBtn");
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
const exportFavoritesMdBtnMobileEl = document.getElementById(
  "exportFavoritesMdBtnMobile",
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
const voiceHistoryBtnEl = document.getElementById("voiceHistoryBtn");
const imageInputEl = document.getElementById("imageInput");
const favoriteBtnEl = document.getElementById("favoriteBtn");
const archiveBtnEl = document.getElementById("archiveBtn");
const tagsBtnEl = document.getElementById("tagsBtn");
const duplicateModalEl = document.getElementById("duplicateModal");
const duplicateTitleInputEl = document.getElementById("duplicateTitleInput");
const duplicateModeFullEl = document.getElementById("duplicateModeFull");
const duplicateModeUserEl = document.getElementById("duplicateModeUser");
const duplicateCancelBtnEl = document.getElementById("duplicateCancelBtn");
const duplicateConfirmBtnEl = document.getElementById("duplicateConfirmBtn");
const voiceHistoryModalEl = document.getElementById("voiceHistoryModal");
const voiceHistoryListEl = document.getElementById("voiceHistoryList");
const voiceHistoryCloseBtnEl = document.getElementById("voiceHistoryCloseBtn");
const clearVoiceHistoryBtnEl = document.getElementById("clearVoiceHistoryBtn");
const confirmModalEl = document.getElementById("confirmModal");
const confirmModalTextEl = document.getElementById("confirmModalText");
const confirmCancelBtnEl = document.getElementById("confirmCancelBtn");
const confirmOkBtnEl = document.getElementById("confirmOkBtn");
const onboardingModalEl = document.getElementById("onboardingModal");
const ollamaStatusBadgeEl = document.getElementById("ollamaStatusBadge");
const systemHealthBadgeEl = document.getElementById("systemHealthBadge");
const ollamaLatencyTextEl = document.getElementById("ollamaLatencyText");
const statusBarEl = document.getElementById("statusBar");
const statusTextEl = document.getElementById("statusText");
const statusRetryBtnEl = document.getElementById("statusRetryBtn");
const userPromptBtnEl = document.getElementById("userPromptBtn");
const shortcutsHelpBtnEl = document.getElementById("shortcutsHelpBtn");
const shortcutsModalEl = document.getElementById("shortcutsModal");
const shortcutsCloseBtnEl = document.getElementById("shortcutsCloseBtn");
const shortcutsListEl = document.getElementById("shortcutsList");
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
const healthSloTextEl = document.getElementById("healthSloText");
const filterAllBtnEl = document.getElementById("filterAllBtn");
const filterFavoritesBtnEl = document.getElementById("filterFavoritesBtn");
const filterArchivedBtnEl = document.getElementById("filterArchivedBtn");
const filterTagInputEl = document.getElementById("filterTagInput");
const filterTagApplyBtnEl = document.getElementById("filterTagApplyBtn");
const chatListSearchInputEl = document.getElementById("chatListSearchInput");
const chatListPaginationInfoEl = document.getElementById("chatListPaginationInfo");
const chatListLoadMoreBtnEl = document.getElementById("chatListLoadMoreBtn");
const searchInputEl = document.getElementById("searchInput");
const searchRoleEl = document.getElementById("searchRole");
const searchFromEl = document.getElementById("searchFrom");
const searchToEl = document.getElementById("searchTo");
const searchBtnEl = document.getElementById("searchBtn");
const searchClearBtnEl = document.getElementById("searchClearBtn");
const searchPageInfoEl = document.getElementById("searchPageInfo");
const searchPrevBtnEl = document.getElementById("searchPrevBtn");
const searchNextBtnEl = document.getElementById("searchNextBtn");
const searchResultsEl = document.getElementById("searchResults");
const ragToggleEl = document.getElementById("ragToggle");
const docInputEl = document.getElementById("docInput");
const docUploadBtnEl = document.getElementById("docUploadBtn");
const ragStatusEl = document.getElementById("ragStatus");
const newUserBtnEl = document.getElementById("newUserBtn");
const renameUserBtnEl = document.getElementById("renameUserBtn");
const deleteUserBtnEl = document.getElementById("deleteUserBtn");
const onboardingBtnEl = document.getElementById("onboardingBtn");
const onboardingModelSelectEl = document.getElementById("onboardingModelSelect");
const onboardingHealthStatusEl = document.getElementById("onboardingHealthStatus");
const onboardingSmokeStatusEl = document.getElementById("onboardingSmokeStatus");
const onboardingRunChecksBtnEl = document.getElementById("onboardingRunChecksBtn");
const onboardingSkipBtnEl = document.getElementById("onboardingSkipBtn");
const onboardingCompleteBtnEl = document.getElementById("onboardingCompleteBtn");
const state = {
  chats: [],
  activeChatId: null,
  recognition: null,
  isListening: false,
  voiceHistory: [],
  isDarkMode: false,
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
  chatList: {
    search: "",
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    scrollTop: 0,
    searchTimer: null,
  },
  telemetryEnabled: false,
  ollamaStatus: "unknown",
  healthPoller: null,
  healthLatencyMs: null,
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

const statusPresenter = createStatusPresenter({
  statusBarEl,
  statusTextEl,
  statusRetryBtnEl,
});
const { hideStatus, showStatus } = statusPresenter;

const modalPresenter = createModalPresenter({
  duplicateModalEl,
  duplicateTitleInputEl,
  duplicateModeFullEl,
  duplicateModeUserEl,
  confirmModalEl,
  confirmModalTextEl,
  voiceHistoryModalEl,
  shortcutsModalEl,
  shortcutsCloseBtnEl,
  onboardingModalEl,
});

const {
  closeConfirmModal,
  closeDuplicateModal,
  closeShortcutsModal,
  closeVoiceHistoryModal,
  hasBlockingModalOpen,
  isShortcutsModalOpen,
  isVoiceHistoryOpen,
  openConfirmModal,
  openDuplicateModal,
  openShortcutsModal,
  openVoiceHistoryModal,
} = modalPresenter;

const shortcutsController = createShortcutsController({
  shortcutsListEl,
  inputEl,
  searchInputEl,
  openShortcutsModal,
  closeShortcutsModal,
  isShortcutsModalOpen,
  hasBlockingModalOpen,
  hasDuplicatePending: () => modalPresenter.hasDuplicatePending(),
  closeDuplicateModal,
  hasConfirmPending: () => modalPresenter.hasConfirmPending(),
  closeConfirmModal,
  isVoiceHistoryOpen,
  closeVoiceHistoryModal,
  isOnboardingOpen: () => !!onboardingModalEl && !onboardingModalEl.classList.contains("hidden"),
  closeOnboardingModal,
  onCreateNewChat: () => createNewChat().catch(console.error),
  onNavigateRelativeTab: (step) => navigateRelativeTab(step),
  onDuplicateActiveChat: () => duplicateActiveChat().catch(console.error),
});

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

function getCurrentUser() {
  return (state.users || []).find((user) => user.id === state.userId) || null;
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
  await fetchJson(`/api/users/${encodeURIComponent(state.userId)}/ui-preferences`, {
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
  resetChatListPagination();
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
  params.set("page", String(state.chatList.page));
  params.set("limit", String(state.chatList.limit));

  if (state.chatFilters.mode === "favorites") {
    params.set("favorite", "true");
  }
  if (state.chatFilters.mode === "archived") {
    params.set("archived", "true");
  }
  if (state.chatFilters.tag) {
    params.set("tag", state.chatFilters.tag);
  }
  if (state.chatList.search) {
    params.set("search", state.chatList.search);
  }

  return params.toString();
}

function updateChatListPaginationUi() {
  if (chatListPaginationInfoEl) {
    const total = state.chatList.total;
    const loaded = state.chats.length;
    if (state.chatList.search) {
      chatListPaginationInfoEl.textContent = `Busca ativa: ${total} conversa(s), ${loaded} carregada(s).`;
    } else {
      chatListPaginationInfoEl.textContent = `Conversas carregadas: ${loaded} de ${total}.`;
    }
  }

  if (!chatListLoadMoreBtnEl) return;
  const hasMore = state.chatList.page < state.chatList.totalPages;
  chatListLoadMoreBtnEl.classList.toggle("hidden", !hasMore);
  chatListLoadMoreBtnEl.disabled = !hasMore;
}

function resetChatListPagination(options = {}) {
  state.chatList.page = 1;
  if (options.keepScroll !== true) {
    state.chatList.scrollTop = 0;
  }
}

function scheduleChatListSearch() {
  if (state.chatList.searchTimer) {
    window.clearTimeout(state.chatList.searchTimer);
  }

  state.chatList.searchTimer = window.setTimeout(() => {
    state.chatList.searchTimer = null;
    resetChatListPagination();
    loadChats().catch(console.error);
  }, 300);
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
  resetChatListPagination();
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
  const startedAt = performance.now();
  let requestOk = false;

  try {
    const data = await fetchJson("/api/health");
    requestOk = true;
    state.ollamaStatus = data.ollama === "online" ? "online" : "offline";
    state.health = {
      status: data.status || "unknown",
      checks: data.checks || {
        db: { status: "unknown" },
        model: { status: "unknown" },
        disk: { status: "unknown" },
      },
      slo: data.slo || { status: "insuficiente", evaluatedRoutes: [] },
      rateLimiter: data.rateLimiter || null,
      alerts: Array.isArray(data.alerts) ? data.alerts : [],
    };
  } catch {
    state.ollamaStatus = "offline";
    state.health = {
      status: "unhealthy",
      checks: {
        db: { status: "unknown" },
        model: { status: "unhealthy" },
        disk: { status: "unknown" },
      },
      slo: { status: "insuficiente", evaluatedRoutes: [] },
      alerts: ["Falha ao consultar endpoint de health"],
    };
  }

  const latencyMs = performance.now() - startedAt;
  state.healthLatencyMs = Number.isFinite(latencyMs) ? Math.max(0, latencyMs) : null;
  state.health = {
    ...state.health,
    latencyMs: state.healthLatencyMs,
    lastCheckedAt: new Date().toISOString(),
  };

  if (ollamaStatusBadgeEl) {
    if (state.ollamaStatus === "online") {
      ollamaStatusBadgeEl.className =
        "inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500";
      ollamaStatusBadgeEl.title = "Ollama conectado";
    } else {
      ollamaStatusBadgeEl.className =
        "inline-block h-2 w-2 shrink-0 rounded-full bg-red-500";
      ollamaStatusBadgeEl.title = "Ollama offline";
    }
  }

  const headerView = buildHeaderPresentation(state.health);
  if (systemHealthBadgeEl) {
    systemHealthBadgeEl.textContent = headerView.badgeText;
    systemHealthBadgeEl.className = headerView.badgeClassName;
    systemHealthBadgeEl.title = headerView.badgeTitle;
  }
  if (ollamaLatencyTextEl) {
    ollamaLatencyTextEl.textContent = headerView.latencyText;
    ollamaLatencyTextEl.className = `text-[11px] ${headerView.latencyClassName}`;
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

  if (healthSloTextEl) {
    const sloStatus = state.health?.slo?.status || "insuficiente";
    const labels = {
      ok: "OK",
      alerta: "ALERTA",
      insuficiente: "SEM AMOSTRAS",
    };
    const evaluatedRoutes = Array.isArray(state.health?.slo?.evaluatedRoutes)
      ? state.health.slo.evaluatedRoutes.filter((item) => item.status !== "insuficiente")
      : [];
    const details = evaluatedRoutes
      .slice(0, 2)
      .map((item) => `${item.route} p95=${item.p95Ms}ms err=${item.errorRate}%`)
      .join(" | ");

    healthSloTextEl.textContent = details
      ? `SLO: ${labels[sloStatus] || "SEM AMOSTRAS"} • ${details}`
      : `SLO: ${labels[sloStatus] || "SEM AMOSTRAS"}`;
  }

  return requestOk;
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
    document.getElementById("exportFavoritesMdBtn"),
    document.getElementById("exportFavoritesMdBtnMobile"),
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

  const actionsRow = document.createElement("div");
  actionsRow.className = "mt-2 flex flex-wrap gap-2";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className =
    "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700";
  copyBtn.textContent = "Copiar mensagem";
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(contentEl.textContent || "");
      copyBtn.textContent = "Copiado";
      setTimeout(() => {
        copyBtn.textContent = "Copiar mensagem";
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  });
  actionsRow.appendChild(copyBtn);

  if (role === "assistant") {
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

    actionsRow.appendChild(speakBtn);

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

  bubble.appendChild(actionsRow);

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

  updateChatListPaginationUi();
  requestAnimationFrame(() => {
    if (tabsEl) {
      tabsEl.scrollTop = state.chatList.scrollTop;
    }
  });
}

async function loadChats(options = {}) {
  try {
    const { appendPage = false } = options;
    const previousScrollTop = tabsEl?.scrollTop || 0;
    const query = buildChatsQueryString();
    const data = await fetchJson(`/api/chats?${query}`);
    const incomingChats = data.chats || [];
    const pagination = data.pagination || {};

    state.chatList.total = Number.parseInt(pagination.total, 10) || incomingChats.length;
    state.chatList.totalPages = Number.parseInt(pagination.totalPages, 10) || 0;
    state.chatList.page = Number.parseInt(pagination.page, 10) || state.chatList.page;

    state.chats = appendPage
      ? [...state.chats, ...incomingChats.filter((chat) => !state.chats.some((item) => item.id === chat.id))]
      : incomingChats;
    state.chatList.scrollTop = previousScrollTop;

    if (!state.chats.length) {
      if (
        state.chatFilters.mode !== "archived" &&
        !state.chatFilters.tag &&
        !state.chatList.search
      ) {
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
            retryAction: statusPresenter.getRetryAction(),
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
      `${API_BASE}/api/chats/${encodeURIComponent(state.activeChatId)}/export?format=markdown`,
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

async function exportFavoriteChatsMarkdown() {
  try {
    const response = await fetch(
      `${API_BASE}/api/chats/export?userId=${encodeURIComponent(state.userId)}&favorites=true&format=markdown`,
    );
    if (!response.ok) {
      throw new Error("Falha ao exportar favoritos em Markdown");
    }

    const markdownText = await response.text();
    const blob = new Blob([markdownText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `chats-favoritos-${state.userId}.md`;
    anchor.click();

    URL.revokeObjectURL(url);
    showStatus("Favoritos exportados em Markdown com sucesso.", {
      type: "success",
    });
  } catch (error) {
    showStatus(`Nao foi possivel exportar favoritos em Markdown: ${error.message}`, {
      type: "error",
      retryAction: () => exportFavoriteChatsMarkdown(),
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
  const passphraseInput = window.prompt(
    "Passphrase opcional para proteger o backup (minimo 8 caracteres). Deixe vazio para gerar backup legado sem criptografia:",
    "",
  );

  if (passphraseInput === null) return;

  const passphrase = String(passphraseInput || "").trim();
  if (passphrase && passphrase.length < 8) {
    showStatus("A passphrase deve ter pelo menos 8 caracteres.", {
      type: "error",
      autoHideMs: 4000,
    });
    return;
  }

  try {
    const headers = {};
    if (passphrase) {
      headers["x-backup-passphrase"] = passphrase;
    }

    const response = await fetch(`${API_BASE}/api/backup/export`, { headers });
    if (!response.ok) {
      throw new Error("Falha ao gerar backup");
    }

    const blob = await response.blob();
    const header = String(response.headers.get("content-disposition") || "");
    const match = header.match(/filename="?([^";]+)"?/i);
    const fileName = match?.[1] || `meu-chat-local-backup-${Date.now()}.tgz`;
    const isProtected = String(response.headers.get("x-backup-protected") || "") === "true";

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);

    showStatus(
      isProtected
        ? "Backup completo exportado com criptografia (passphrase obrigatoria para restaurar)."
        : "Backup completo exportado sem criptografia (compatibilidade legado).",
      {
        type: "success",
        autoHideMs: 4000,
      },
    );
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

async function restoreFullBackup() {
  const confirmed = await openConfirmModal(
    "Restaurar backup ira substituir o banco atual. Deseja continuar?",
  );
  if (!confirmed) return;

  try {
    const file = await pickBackupFile();
    if (!file) return;

    const passphraseInput = window.prompt(
      "Se o backup estiver criptografado, informe a passphrase. Para backup legado, deixe vazio:",
      "",
    );
    if (passphraseInput === null) return;

    const passphrase = String(passphraseInput || "").trim();
    if (passphrase && passphrase.length < 8) {
      showStatus("A passphrase deve ter pelo menos 8 caracteres.", {
        type: "error",
        autoHideMs: 4000,
      });
      return;
    }

    const archiveBase64 = await readFileAsBase64(file, {
      readErrorMessage: "Falha ao ler arquivo",
      emptyFileMessage: "Arquivo de backup invalido",
    });
    await fetchJson("/api/backup/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archiveBase64, passphrase: passphrase || null }),
    });

    await loadUsers();
    await loadChats();
    await loadRagDocuments();

    showStatus(
      passphrase
        ? "Backup restaurado com sucesso (modo protegido)."
        : "Backup restaurado com sucesso.",
      {
        type: "success",
        autoHideMs: 3500,
      },
    );
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

function openVoiceHistoryModalWithRender() {
  renderVoiceHistory();
  openVoiceHistoryModal();
}

function updateSendButtonState() {
  sendBtnEl.disabled = inputEl.value.trim() === "";
}

function navigateRelativeTab(step) {
  const totalChats = state.chats.length;
  if (!totalChats) return;

  const currentIndex = state.chats.findIndex(
    (chat) => chat.id === state.activeChatId,
  );
  const baseIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (baseIndex + step + totalChats) % totalChats;
  const chat = state.chats[nextIndex];
  if (!chat?.id) return;
  switchChat(chat.id).catch(console.error);
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

shortcutsController.renderShortcutsHelp();

inputEl.addEventListener("input", updateSendButtonState);

inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    enviar();
  }
});

document.addEventListener("keydown", shortcutsController.handleGlobalShortcuts);

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

if (exportFavoritesMdBtnEl) {
  exportFavoritesMdBtnEl.addEventListener("click", () => {
    exportFavoriteChatsMarkdown().catch((err) => {
      console.error(err);
    });
  });
}

if (exportFavoritesMdBtnMobileEl) {
  exportFavoritesMdBtnMobileEl.addEventListener("click", () => {
    exportFavoriteChatsMarkdown().catch((err) => {
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
  voiceHistoryBtnEl.addEventListener("click", openVoiceHistoryModalWithRender);
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
    const action = statusPresenter.getRetryAction();
    if (!action) return;
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
    resetChatListPagination();
    loadChats().catch(console.error);
  });
}

if (filterTagInputEl) {
  filterTagInputEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    state.chatFilters.tag = (filterTagInputEl.value || "").trim();
    resetChatListPagination();
    loadChats().catch(console.error);
  });
}

if (chatListSearchInputEl) {
  chatListSearchInputEl.addEventListener("input", () => {
    state.chatList.search = (chatListSearchInputEl.value || "").trim();
    scheduleChatListSearch();
  });
}

if (chatListLoadMoreBtnEl) {
  chatListLoadMoreBtnEl.addEventListener("click", () => {
    if (state.chatList.page >= state.chatList.totalPages) return;
    state.chatList.page += 1;
    loadChats({ appendPage: true }).catch(console.error);
  });
}

if (tabsEl) {
  tabsEl.addEventListener("scroll", () => {
    state.chatList.scrollTop = tabsEl.scrollTop;
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
    if (state.healthPoller) {
      state.healthPoller.refreshNow();
      return;
    }
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
    await loadUsers();
    await loadChats();
    await loadRagDocuments();
  } catch (error) {
    console.error(error);
  }

  state.healthPoller = createHealthPoller({
    checkHealth: () => checkOllamaStatus(),
    baseIntervalMs: 30_000,
    maxIntervalMs: 300_000,
  });
  state.healthPoller.start();

  if (localStorage.getItem("onboardingDone") !== "true") {
    openOnboardingModal();
  }
})();
