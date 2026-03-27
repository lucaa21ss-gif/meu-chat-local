import { initializeApp } from "./bootstrap.js";
import { createBackupController } from "./src/app/shared/backup.js";
import { createAppBindingsController } from "./src/app/shared/app-bindings.js";
import { createAppRuntimeController } from "./src/app/shared/app-runtime.js";
import { createChatActionsController } from "./src/app/chat/chat-actions.js";
import { createChatExportController } from "./src/app/chat/chat-export.js";
import { createChatFiltersController } from "./src/app/chat/chat-filters.js";
import { createChatNavigationController } from "./src/app/chat/chat-navigation.js";
import { createChatRenderController } from "./src/app/chat/chat-render.js";
import { createChatSendController } from "./src/app/chat/chat-send.js";
import { createChatUtilsController } from "./src/app/chat/chat-utils.js";
import { escapeRegExp, formatBytes, formatDateLabel } from "./src/app/shared/format.js";
import { filesToBase64, filesToDocuments } from "./src/app/shared/files.js";
import { createChatListController } from "./src/app/chat/chat-list.js";
import { createModalPresenter } from "./src/app/shared/modal.js";
import { createHistorySearchController } from "./src/app/chat/history-search.js";
import { createHealthStatusController } from "./src/app/admin/health-status.js";
import { createOnboardingController } from "./src/app/shared/onboarding.js";
import { createPreferencesController } from "./src/app/shared/preferences.js";
import { createProfilesController } from "./src/app/shared/profiles.js";
import { createRagController } from "./src/app/chat/rag.js";
import { createRbacController } from "./src/app/shared/rbac.js";
import { createShortcutsController } from "./src/app/shared/shortcuts.js";
import { createStatusPresenter } from "./src/app/shared/status.js";
import {
  buildAppBindingsDeps,
  buildAppRuntimeDeps,
  buildBackupDeps,
  buildChatActionsDeps,
  buildChatExportDeps,
  buildChatFiltersDeps,
  buildChatListControllerDeps,
  buildChatNavigationDeps,
  buildChatRenderDeps,
  buildChatSendDeps,
  buildChatUtilsDeps,
  buildHealthStatusDeps,
  buildHistorySearchDeps,
  buildModalPresenterDeps,
  buildOnboardingDeps,
  buildPreferencesDeps,
  buildProfilesDeps,
  buildRagDeps,
  buildShortcutsDeps,
  buildStatusPresenterDeps,
  buildStorageDeps,
  buildTelemetryAdminDeps,
  buildThemeLocalDeps,
  buildVoiceDeps,
} from "./src/app/shared/app-wiring.js";
import { createStorageController } from "./src/app/admin/storage.js";
import { createTelemetryAdminController } from "./src/app/admin/telemetry-admin.js";
import { createThemeLocalController } from "./src/app/shared/theme-local.js";
import { createVoiceController } from "./src/app/shared/voice.js";
import { isDarkForMode, normalizeThemeMode } from "./src/app/shared/theme.js";
import { createContextRailController } from "./src/app/shared/context-rail.js";
import { buildHeaderPresentation, createHealthPoller } from "./health-indicators.js";

/* ─── Bootstrap: DOM + State + API ────────────────────────── */
const { elements, state, fetchJson } = initializeApp();
const API_BASE = window.location.origin;

const {
  chatEl, inputEl, typingEl, sendBtnEl, tabsEl, newChatBtnEl, exportBtnEl,
  exportJsonBtnEl, exportAllJsonBtnEl, exportFavoritesMdBtnEl, importJsonBtnEl,
  chatTabsMobileEl, newChatBtnMobileEl, duplicateBtnEl, duplicateBtnMobileEl,
  renameBtnEl, deleteBtnEl, systemPromptBtnEl, renameBtnMobileEl, deleteBtnMobileEl,
  exportBtnMobileEl, exportJsonBtnMobileEl, exportAllJsonBtnMobileEl,
  exportFavoritesMdBtnMobileEl, backupBtnEl, restoreBackupBtnEl, backupBtnMobileEl,
  restoreBackupBtnMobileEl, backupRestoreInputEl, importJsonBtnMobileEl, voiceBtnEl,
  voiceHistoryBtnEl, imageInputEl, favoriteBtnEl, archiveBtnEl, tagsBtnEl,
  duplicateModalEl, duplicateTitleInputEl, duplicateModeFullEl, duplicateModeUserEl,
  duplicateCancelBtnEl, duplicateConfirmBtnEl, voiceHistoryModalEl, voiceHistoryListEl,
  voiceHistoryCloseBtnEl, clearVoiceHistoryBtnEl, confirmModalEl, confirmModalTextEl,
  confirmCancelBtnEl, confirmOkBtnEl, onboardingModalEl, ollamaStatusBadgeEl,
  systemHealthBadgeEl, ollamaLatencyTextEl, statusBarEl, statusTextEl, statusRetryBtnEl,
  userPromptBtnEl, shortcutsHelpBtnEl, shortcutsModalEl, shortcutsCloseBtnEl,
  shortcutsListEl, userSelectEl, darkModeBtnEl, sunIconEl, moonIconEl, autoIconEl,
  storageUsageTextEl, storageAlertTextEl, storageRefreshBtnEl, storageCleanupBtnEl,
  storageLimitBtnEl, telemetryOptInEl, telemetryStatsBtnEl, auditExportBtnEl,
  configHistoryBtnEl, diagnosticsExportBtnEl, healthRefreshBtnEl, healthSummaryTextEl,
  healthChecksTextEl, healthSloTextEl, filterAllBtnEl, filterFavoritesBtnEl,
  filterArchivedBtnEl, filterTagInputEl, filterTagApplyBtnEl, chatListSearchInputEl,
  chatListPaginationInfoEl, chatListLoadMoreBtnEl, searchInputEl, searchRoleEl,
  searchFromEl, searchToEl, searchBtnEl, searchClearBtnEl, searchPageInfoEl,
  searchPrevBtnEl, searchNextBtnEl, searchResultsEl, ragToggleEl, docInputEl,
  docUploadBtnEl, ragStatusEl, newUserBtnEl, renameUserBtnEl, deleteUserBtnEl,
  onboardingBtnEl, onboardingModelSelectEl, onboardingHealthStatusEl,
  onboardingSmokeStatusEl, onboardingRunChecksBtnEl, onboardingSkipBtnEl,
  onboardingCompleteBtnEl,
} = elements;

const statusPresenter = createStatusPresenter(buildStatusPresenterDeps({
  statusBarEl,
  statusTextEl,
  statusRetryBtnEl,
}));
const { hideStatus, showStatus } = statusPresenter;

const modalPresenter = createModalPresenter(buildModalPresenterDeps({
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
}));

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

function applyThemeMode(mode, options = {}) {
  const safeMode = normalizeThemeMode(mode);
  const shouldPersistLocal = options.persistLocal !== false;
  const isDark = isDarkForMode(safeMode);

  state.themeMode = safeMode;
  state.isDarkMode = isDark;

  document.documentElement.classList.toggle("dark", isDark);

  if (shouldPersistLocal) {
    localStorage.setItem("themeMode", safeMode);
  }

  if (typeof themeLocalController?.updateToggleUi === "function") {
    themeLocalController.updateToggleUi(safeMode);
  }
}

const chatListController = createChatListController(buildChatListControllerDeps({
  state,
  chatListPaginationInfoEl,
  chatListLoadMoreBtnEl,
  onScheduledSearch: () => {
    chatNavigationController.loadChats().catch(console.error);
  },
}));

const historySearchController = createHistorySearchController(buildHistorySearchDeps({
  state,
  searchResultsEl,
  searchPageInfoEl,
  searchPrevBtnEl,
  searchNextBtnEl,
  searchInputEl,
  searchRoleEl,
  searchFromEl,
  searchToEl,
  fetchJson,
  showStatus,
  hideStatus,
  formatDateLabel,
  escapeRegExp,
  getActiveChatId: () => state.activeChatId,
}));

const onboardingController = createOnboardingController(buildOnboardingDeps({
  state,
  apiBase: API_BASE,
  onboardingModalEl,
  onboardingModelSelectEl,
  onboardingHealthStatusEl,
  onboardingSmokeStatusEl,
  getMainModelSelect: () => document.getElementById("modelo"),
  getFallbackModel: () => chatUtilsController.getControls().model,
  savePreferredModel: (model) => preferencesController.savePreferredModel(model),
  showStatus,
}));

const healthStatusController = createHealthStatusController(buildHealthStatusDeps({
  state,
  fetchJson,
  buildHeaderPresentation,
  ollamaStatusBadgeEl,
  systemHealthBadgeEl,
  ollamaLatencyTextEl,
  healthSummaryTextEl,
  healthChecksTextEl,
  healthSloTextEl,
}));

const telemetryAdminController = createTelemetryAdminController(buildTelemetryAdminDeps({
  state,
  apiBase: API_BASE,
  fetchJson,
  telemetryOptInEl,
  showStatus,
  formatDateLabel,
  onAfterConfigRollback: async () => {
    await telemetryAdminController.loadTelemetryState();
    await profilesController.loadUsers();
    await chatNavigationController.loadChats();
  },
}));

const getCurrentUser = () => appRuntimeController.getCurrentUser();

const rbacController = createRbacController({
  getCurrentUser,
});

const preferencesController = createPreferencesController(buildPreferencesDeps({
  state,
  fetchJson,
  getCurrentUser,
  getMainModelSelect: () => document.getElementById("modelo"),
  applyThemeMode,
}));

const loadChats = () => chatNavigationController.loadChats();
const loadUsers = () => profilesController.loadUsers();
const loadRagDocuments = () => ragController.loadDocuments();
const resetChatListPagination = () => chatListController.resetPagination();
const hideTyping = () => chatRenderController.hideTyping();
const smoothScrollToBottom = () => appRuntimeController.smoothScrollToBottom();

const profilesController = createProfilesController(buildProfilesDeps({
  state,
  userSelectEl,
  fetchJson,
  showStatus,
  onSyncThemeFromCurrentUser: () => preferencesController.syncThemeFromCurrentUser(),
  onUpdateRbacUi: () => rbacController.updateUi(),
  onLoadStorageUsage: () => storageController.loadUsage(),
  onLoadChats: loadChats,
  onLoadRagDocuments: loadRagDocuments,
  onResetChatListPagination: resetChatListPagination,
}));

const storageController = createStorageController(buildStorageDeps({
  state,
  storageUsageTextEl,
  storageAlertTextEl,
  fetchJson,
  formatBytes,
  openConfirmModal,
  showStatus,
  onLoadUsers: loadUsers,
}));

const chatFiltersController = createChatFiltersController(buildChatFiltersDeps({
  state,
  filterAllBtnEl,
  filterFavoritesBtnEl,
  filterArchivedBtnEl,
  filterTagInputEl,
  onResetPagination: resetChatListPagination,
  onLoadChats: loadChats,
}));

const chatExportController = createChatExportController(buildChatExportDeps({
  state,
  apiBase: API_BASE,
  fetchJson,
  showStatus,
  onLoadChats: loadChats,
  onLoadMessages: (chatId) => chatNavigationController.loadMessages(chatId),
}));

const chatActionsController = createChatActionsController(buildChatActionsDeps({
  state,
  fetchJson,
  showStatus,
  openConfirmModal,
  openDuplicateModal,
  uid: () => appRuntimeController.uid(),
  onLoadChats: loadChats,
  onSwitchChat: (chatId) => chatNavigationController.switchChat(chatId),
}));

const chatSendController = createChatSendController(buildChatSendDeps({
  state,
  inputEl,
  imageInputEl,
  sendBtnEl,
  ragToggleEl,
  apiBase: API_BASE,
  fetchJson,
  filesToBase64,
  appendMessage: (role, content, options) => chatRenderController.appendMessage(role, content, options),
  showTyping: () => chatRenderController.showTyping(),
  hideTyping,
  smoothScrollToBottom,
  showStatus,
  hideStatus,
  getControls: () => chatUtilsController.getControls(),
  onEnsureActiveChat: () => chatNavigationController.createNewChat(),
  onLoadChats: loadChats,
  getRetryAction: () => statusPresenter.getRetryAction(),
}));

const chatRenderController = createChatRenderController(buildChatRenderDeps({
  state,
  chatEl,
  typingEl,
  tabsEl,
  tabsMobileEl: chatTabsMobileEl,
  favoriteBtnEl,
  archiveBtnEl,
  switchChat: (chatId) => chatNavigationController.switchChat(chatId),
  smoothScrollToBottom,
  updateChatListPaginationUi: () => chatListController.updatePaginationUi(),
}));

const chatNavigationController = createChatNavigationController(buildChatNavigationDeps({
  state,
  chatEl,
  tabsEl,
  fetchJson,
  buildChatsQueryString: () => chatListController.buildQueryString(),
  renderTabs: () => chatRenderController.renderTabs(),
  appendMessage: (role, content, options) => chatRenderController.appendMessage(role, content, options),
  hideTyping,
  hideStatus,
  showStatus,
  loadRagDocuments: loadRagDocuments,
  runHistorySearch: (options) => historySearchController.runHistorySearch(options),
  clearSearchResults: () => historySearchController.clearSearchResults(),
  chatActionsController,
}));

const backupController = createBackupController(buildBackupDeps({
  apiBase: API_BASE,
  backupRestoreInputEl,
  fetchJson,
  showStatus,
  openConfirmModal,
  onLoadUsers: loadUsers,
  onLoadChats: loadChats,
  onLoadRagDocuments: loadRagDocuments,
}));

const themeLocalController = createThemeLocalController(buildThemeLocalDeps({
  state,
  darkModeBtnEl,
  sunIconEl,
  moonIconEl,
  autoIconEl,
  applyThemeMode,
}));

const voiceController = createVoiceController(buildVoiceDeps({
  state,
  inputEl,
  voiceBtnEl,
  voiceHistoryListEl,
  openVoiceHistoryModal,
  closeVoiceHistoryModal,
  onUpdateSendButtonState: () => appBindingsController.updateSendButtonState(),
}));

const ragController = createRagController(buildRagDeps({
  state,
  ragStatusEl,
  docInputEl,
  fetchJson,
  filesToDocuments,
  showStatus,
  getActiveChatId: () => state.activeChatId,
}));

const shortcutsController = createShortcutsController(buildShortcutsDeps({
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
  isOnboardingOpen: () => onboardingController.isOpen(),
  closeOnboardingModal: () => onboardingController.closeModal(),
  onCreateNewChat: () => chatNavigationController.createNewChat().catch(console.error),
  onNavigateRelativeTab: (step) => chatNavigationController.navigateRelativeTab(step),
  onDuplicateActiveChat: () => chatActionsController.duplicateActiveChat().catch(console.error),
}));

const chatUtilsController = createChatUtilsController(buildChatUtilsDeps({
  state,
  fetchJson,
  chatEl,
  imageInputEl,
  hideTyping,
  loadUsers,
  loadChats,
  showStatus,
  openConfirmModal,
}));

const appRuntimeController = createAppRuntimeController(buildAppRuntimeDeps({
  state,
  chatEl,
  createHealthPoller,
  checkOllamaStatus: () => healthStatusController.checkHealth(),
  loadDarkMode: () => themeLocalController.loadSavedMode(),
  applyPreferredModel: () => preferencesController.applyPreferredModel(),
  loadVoiceHistory: () => voiceController.loadHistory(),
  setupVoiceInput: () => voiceController.setupInput(),
  setupDragAndDrop: () => chatUtilsController.setupDragAndDrop(),
  updateSendButtonState: () => appBindingsController.updateSendButtonState(),
  updateFilterUi: () => chatFiltersController.updateUi(),
  renderStorageUsage: () => storageController.renderUsage(),
  loadTelemetryState: () => telemetryAdminController.loadTelemetryState(),
  loadUsers,
  loadChats,
  loadRagDocuments,
  openOnboardingModal: () => onboardingController.openModal(),
}));

async function enviarComAtualizacao() {
  await chatSendController.enviar();
  appBindingsController.updateSendButtonState();
}

const appBindingsController = createAppBindingsController({
  ...buildAppBindingsDeps({
    state,
    elements,
    shortcutsController,
    onboardingController,
    voiceController,
    statusPresenter,
    closeDuplicateModal,
    closeConfirmModal,
    closeShortcutsModal,
    closeVoiceHistoryModal,
    openConfirmModal,
    openShortcutsModal,
    showStatus,
    enviar: enviarComAtualizacao,
    chatNavigationController,
    chatActionsController,
    chatExportController,
    backupController,
    themeLocalController,
    preferencesController,
    healthStatusController,
    storageController,
    telemetryAdminController,
    historySearchController,
  }),
});

appBindingsController.bindAll();

const contextRailController = createContextRailController({
  state,
  inputEl,
  searchInputEl,
  ragToggleEl,
  modelEl: document.getElementById("modelo"),
  ctxEl: document.getElementById("ctx"),
  tempEl: document.getElementById("temp"),
  appBindingsController,
  chatUtilsController,
  hasBlockingModalOpen,
  ui: {
    activeTitleEl: document.getElementById("contextActiveTitle"),
    chipModelEl: document.getElementById("contextChipModel"),
    chipChatEl: document.getElementById("contextChipChat"),
    chipHealthEl: document.getElementById("contextChipHealth"),
    chipSelectionEl: document.getElementById("contextChipSelection"),
    stepAnalyzeEl: document.getElementById("contextStepAnalyze"),
    stepBuildEl: document.getElementById("contextStepBuild"),
    stepValidateEl: document.getElementById("contextStepValidate"),
    evidenceListEl: document.getElementById("contextEvidenceList"),
    quickExplainBtnEl: document.getElementById("contextQuickExplainBtn"),
    quickRefactorBtnEl: document.getElementById("contextQuickRefactorBtn"),
    quickTestBtnEl: document.getElementById("contextQuickTestBtn"),
  },
});

contextRailController.start();

const areaFocusMap = {
  "1": "identityArea",
  "2": "toolsOpsArea",
  "3": "flowWorkspaceArea",
  "4": "conversationArea",
};

const areaIds = Object.values(areaFocusMap);
const areaLabelMap = {
  identityArea: "Identidade",
  toolsOpsArea: "Ferramentas",
  flowWorkspaceArea: "Fluxo",
  conversationArea: "Conversa",
};
const areaStorageKey = "activeAreaId";
const toolsOpsDetailsStorageKey = "toolsOpsDetailsOpen";
const toolsConfigDetailsStorageKey = "toolsConfigDetailsOpen";
let currentAreaId = null;
let storageAvailable = true;
const sessionFallbackStore = new Map();

try {
  const storageProbeKey = "__area_storage_probe__";
  localStorage.setItem(storageProbeKey, "ok");
  localStorage.removeItem(storageProbeKey);
} catch {
  storageAvailable = false;
}

function getStoredAreaId() {
  return getPersistedValue(areaStorageKey);
}

function setStoredAreaId(areaId) {
  setPersistedValue(areaStorageKey, areaId);
}

function clearStoredAreaId() {
  removePersistedValue(areaStorageKey);
}

function getPersistedValue(key) {
  if (storageAvailable) {
    return localStorage.getItem(key);
  }
  return sessionFallbackStore.get(key) || null;
}

function setPersistedValue(key, value) {
  if (storageAvailable) {
    localStorage.setItem(key, String(value));
    return;
  }
  sessionFallbackStore.set(key, String(value));
}

function removePersistedValue(key) {
  if (storageAvailable) {
    localStorage.removeItem(key);
    return;
  }
  sessionFallbackStore.delete(key);
}

function updateActiveAreaPill(areaId) {
  const activeAreaPillEl = document.getElementById("activeAreaPill");
  const label = areaLabelMap[areaId] || "Conversa";
  const persistenceLabel = storageAvailable ? "" : " (sessao)";
  const text = `Area ativa: ${label}${persistenceLabel}`;

  if (activeAreaPillEl) {
    activeAreaPillEl.textContent = text;
  }

  const activeAreaPillMobileEl = document.getElementById("activeAreaPillMobile");
  if (activeAreaPillMobileEl) {
    activeAreaPillMobileEl.textContent = text;
  }
}

function setCurrentArea(areaId) {
  if (!areaIds.includes(areaId) || currentAreaId === areaId) {
    return;
  }

  if (currentAreaId) {
    document.getElementById(currentAreaId)?.classList.remove("ai-area-is-current");
  }

  currentAreaId = areaId;
  const currentAreaEl = document.getElementById(currentAreaId);
  currentAreaEl?.classList.add("ai-area-is-current");
  currentAreaEl?.classList.add("ai-area-change-pulse");
  updateActiveAreaPill(currentAreaId);
  setStoredAreaId(currentAreaId);
  window.setTimeout(() => {
    currentAreaEl?.classList.remove("ai-area-change-pulse");
  }, 420);
}

function resetAreaLayout() {
  clearStoredAreaId();
  removePersistedValue(toolsOpsDetailsStorageKey);
  removePersistedValue(toolsConfigDetailsStorageKey);

  const toolsOpsDetailsEl = document.getElementById("toolsOpsDetails");
  const toolsConfigDetailsEl = document.getElementById("toolsConfigDetails");
  if (toolsOpsDetailsEl) {
    toolsOpsDetailsEl.open = true;
  }
  if (toolsConfigDetailsEl) {
    toolsConfigDetailsEl.open = true;
  }

  const conversationAreaEl = document.getElementById("conversationArea");
  setCurrentArea("conversationArea");
  conversationAreaEl?.focus({ preventScroll: true });
  conversationAreaEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (conversationAreaEl) {
    applyAreaFocusHighlight(conversationAreaEl);
  }

  showStatus("Layout resetado para Conversa.", {
    type: "success",
    autoHideMs: 1800,
  });
}

function restoreToolsDetailsState() {
  const toolsOpsDetailsEl = document.getElementById("toolsOpsDetails");
  const toolsConfigDetailsEl = document.getElementById("toolsConfigDetails");

  const persistedOps = getPersistedValue(toolsOpsDetailsStorageKey);
  const persistedConfig = getPersistedValue(toolsConfigDetailsStorageKey);

  if (toolsOpsDetailsEl && (persistedOps === "true" || persistedOps === "false")) {
    toolsOpsDetailsEl.open = persistedOps === "true";
  }

  if (toolsConfigDetailsEl && (persistedConfig === "true" || persistedConfig === "false")) {
    toolsConfigDetailsEl.open = persistedConfig === "true";
  }
}

function bindToolsDetailsPersistence() {
  const toolsOpsDetailsEl = document.getElementById("toolsOpsDetails");
  const toolsConfigDetailsEl = document.getElementById("toolsConfigDetails");

  toolsOpsDetailsEl?.addEventListener("toggle", () => {
    setPersistedValue(toolsOpsDetailsStorageKey, toolsOpsDetailsEl.open);
  });

  toolsConfigDetailsEl?.addEventListener("toggle", () => {
    setPersistedValue(toolsConfigDetailsStorageKey, toolsConfigDetailsEl.open);
  });
}

function applyAreaFocusHighlight(areaEl) {
  areaEl.classList.add("ai-area-focus-ring");
  window.setTimeout(() => {
    areaEl.classList.remove("ai-area-focus-ring");
  }, 1200);
}

function isAreaFocusHotkey(event) {
  return event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey;
}

function handleAreaFocusHotkeys(event) {
  if (!isAreaFocusHotkey(event) || hasBlockingModalOpen()) {
    return;
  }

  const areaId = areaFocusMap[event.key];
  if (!areaId) {
    return;
  }

  const areaEl = document.getElementById(areaId);
  if (!areaEl) {
    return;
  }

  event.preventDefault();
  setCurrentArea(areaId);
  areaEl.focus({ preventScroll: true });
  areaEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  applyAreaFocusHighlight(areaEl);
}

function findTrackedAreaIdFromTarget(target) {
  const targetNode = target instanceof Element ? target : null;
  if (!targetNode) return null;

  const areaEl = targetNode.closest("#identityArea, #toolsOpsArea, #flowWorkspaceArea, #conversationArea");
  return areaEl?.id || null;
}

function handleAreaFocusSync(event) {
  const areaId = findTrackedAreaIdFromTarget(event.target);
  if (areaId) {
    setCurrentArea(areaId);
  }
}

function handleAreaPointerSync(event) {
  const areaId = findTrackedAreaIdFromTarget(event.target);
  if (areaId) {
    setCurrentArea(areaId);
  }
}

document.addEventListener("keydown", handleAreaFocusHotkeys);
document.addEventListener("focusin", handleAreaFocusSync);
document.addEventListener("pointerdown", handleAreaPointerSync);

document.getElementById("resetLayoutBtn")?.addEventListener("click", resetAreaLayout);
document.getElementById("resetLayoutBtnMobile")?.addEventListener("click", resetAreaLayout);

window.addEventListener("beforeunload", () => {
  contextRailController.stop();
  document.removeEventListener("keydown", handleAreaFocusHotkeys);
  document.removeEventListener("focusin", handleAreaFocusSync);
  document.removeEventListener("pointerdown", handleAreaPointerSync);
}, { once: true });

window.enviar = enviarComAtualizacao;
window.resetar = async () => {
  await chatUtilsController.resetar();
};

(async function bootstrap() {
  await appRuntimeController.bootstrap();
  restoreToolsDetailsState();
  bindToolsDetailsPersistence();
  let initialAreaId = "conversationArea";
  const persistedArea = getStoredAreaId();
  if (areaIds.includes(persistedArea)) {
    initialAreaId = persistedArea;
  }
  setCurrentArea(initialAreaId);
  contextRailController.render();
})();
