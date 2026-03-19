import { createApiClient } from "./app/shared/api.js";
import { createBackupController } from "./app/shared/backup.js";
import { createAppBindingsController } from "./app/shared/app-bindings.js";
import { createChatActionsController } from "./app/shared/chat-actions.js";
import { createChatExportController } from "./app/shared/chat-export.js";
import { createChatFiltersController } from "./app/shared/chat-filters.js";
import { createChatNavigationController } from "./app/shared/chat-navigation.js";
import { createChatRenderController } from "./app/shared/chat-render.js";
import { createChatSendController } from "./app/shared/chat-send.js";
import { createChatUtilsController } from "./app/shared/chat-utils.js";
import { escapeRegExp, formatBytes, formatDateLabel } from "./app/shared/format.js";
import { filesToBase64, filesToDocuments } from "./app/shared/files.js";
import { createChatListController } from "./app/shared/chat-list.js";
import { createModalPresenter } from "./app/shared/modal.js";
import { createHistorySearchController } from "./app/shared/history-search.js";
import { createHealthStatusController } from "./app/shared/health-status.js";
import { createOnboardingController } from "./app/shared/onboarding.js";
import { createPreferencesController } from "./app/shared/preferences.js";
import { createProfilesController } from "./app/shared/profiles.js";
import { createRagController } from "./app/shared/rag.js";
import { createRbacController } from "./app/shared/rbac.js";
import { createShortcutsController } from "./app/shared/shortcuts.js";
import { createStatusPresenter } from "./app/shared/status.js";
import { createStorageController } from "./app/shared/storage.js";
import { createTelemetryAdminController } from "./app/shared/telemetry-admin.js";
import { createThemeLocalController } from "./app/shared/theme-local.js";
import { createVoiceController } from "./app/shared/voice.js";
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

const chatListController = createChatListController({
  state,
  chatListPaginationInfoEl,
  chatListLoadMoreBtnEl,
  onScheduledSearch: () => {
    loadChats().catch(console.error);
  },
});

const historySearchController = createHistorySearchController({
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
});

const onboardingController = createOnboardingController({
  state,
  apiBase: API_BASE,
  onboardingModalEl,
  onboardingModelSelectEl,
  onboardingHealthStatusEl,
  onboardingSmokeStatusEl,
  getMainModelSelect: () => document.getElementById("modelo"),
  getFallbackModel: () => getControls().model,
  savePreferredModel,
  showStatus,
});

const healthStatusController = createHealthStatusController({
  state,
  fetchJson,
  buildHeaderPresentation,
  ollamaStatusBadgeEl,
  systemHealthBadgeEl,
  ollamaLatencyTextEl,
  healthSummaryTextEl,
  healthChecksTextEl,
  healthSloTextEl,
});

const telemetryAdminController = createTelemetryAdminController({
  state,
  apiBase: API_BASE,
  fetchJson,
  telemetryOptInEl,
  showStatus,
  formatDateLabel,
  onAfterConfigRollback: async () => {
    await loadTelemetryState();
    await loadUsers();
    await loadChats();
  },
});

const rbacController = createRbacController({
  getCurrentUser: () => getCurrentUser(),
});

const preferencesController = createPreferencesController({
  state,
  fetchJson,
  getCurrentUser: () => getCurrentUser(),
  getMainModelSelect: () => document.getElementById("modelo"),
  applyThemeMode,
});

const profilesController = createProfilesController({
  state,
  userSelectEl,
  fetchJson,
  showStatus,
  onSyncThemeFromCurrentUser: () => syncThemeFromCurrentUser(),
  onUpdateRbacUi: () => updateRbacUi(),
  onLoadStorageUsage: () => loadStorageUsage(),
  onLoadChats: () => loadChats(),
  onLoadRagDocuments: () => loadRagDocuments(),
  onResetChatListPagination: () => chatListController.resetPagination(),
});

const storageController = createStorageController({
  state,
  storageUsageTextEl,
  storageAlertTextEl,
  fetchJson,
  formatBytes,
  openConfirmModal,
  showStatus,
  onLoadUsers: () => loadUsers(),
});

const chatFiltersController = createChatFiltersController({
  state,
  filterAllBtnEl,
  filterFavoritesBtnEl,
  filterArchivedBtnEl,
  filterTagInputEl,
  onResetPagination: () => resetChatListPagination(),
  onLoadChats: () => loadChats(),
});

const chatExportController = createChatExportController({
  state,
  apiBase: API_BASE,
  fetchJson,
  showStatus,
  onLoadChats: () => loadChats(),
  onLoadMessages: () => loadMessages(),
});

const chatActionsController = createChatActionsController({
  state,
  fetchJson,
  showStatus,
  openConfirmModal,
  openDuplicateModal,
  uid,
  onLoadChats: () => loadChats(),
  onSwitchChat: (chatId) => switchChat(chatId),
});

const chatSendController = createChatSendController({
  state,
  inputEl,
  imageInputEl,
  sendBtnEl,
  ragToggleEl,
  apiBase: API_BASE,
  fetchJson,
  filesToBase64,
  appendMessage,
  showTyping,
  hideTyping,
  smoothScrollToBottom,
  showStatus,
  hideStatus,
  getControls,
  onEnsureActiveChat: () => createNewChat(),
  onLoadChats: () => loadChats(),
  getRetryAction: () => statusPresenter.getRetryAction(),
});

const chatRenderController = createChatRenderController({
  state,
  chatEl,
  typingEl,
  tabsEl,
  tabsMobileEl,
  favoriteBtnEl,
  archiveBtnEl,
  switchChat,
  smoothScrollToBottom,
  updateChatListPaginationUi,
});

const chatNavigationController = createChatNavigationController({
  state,
  chatEl,
  tabsEl,
  fetchJson,
  buildChatsQueryString,
  renderTabs,
  appendMessage,
  hideTyping,
  hideStatus,
  showStatus,
  loadRagDocuments,
  runHistorySearch,
  clearSearchResults,
  chatActionsController,
});

const backupController = createBackupController({
  apiBase: API_BASE,
  backupRestoreInputEl,
  fetchJson,
  showStatus,
  openConfirmModal,
  onLoadUsers: () => loadUsers(),
  onLoadChats: () => loadChats(),
  onLoadRagDocuments: () => loadRagDocuments(),
});

const themeLocalController = createThemeLocalController({
  state,
  darkModeBtnEl,
  sunIconEl,
  moonIconEl,
  autoIconEl,
  applyThemeMode,
});

const voiceController = createVoiceController({
  state,
  inputEl,
  voiceBtnEl,
  voiceHistoryListEl,
  openVoiceHistoryModal,
  closeVoiceHistoryModal,
  onUpdateSendButtonState: () => updateSendButtonState(),
});

const ragController = createRagController({
  state,
  ragStatusEl,
  docInputEl,
  fetchJson,
  filesToDocuments,
  showStatus,
  getActiveChatId: () => state.activeChatId,
});

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
  isOnboardingOpen: () => onboardingController.isOpen(),
  closeOnboardingModal: () => onboardingController.closeModal(),
  onCreateNewChat: () => createNewChat().catch(console.error),
  onNavigateRelativeTab: (step) => navigateRelativeTab(step),
  onDuplicateActiveChat: () => duplicateActiveChat().catch(console.error),
});

const chatUtilsController = createChatUtilsController({
  state,
  fetchJson,
  chatEl,
  imageInputEl,
  hideTyping,
  loadUsers,
  loadChats,
  showStatus,
  openConfirmModal,
});

const appBindingsController = createAppBindingsController({
  state,
  inputEl,
  sendBtnEl,
  tabsEl,
  duplicateModalEl,
  duplicateTitleInputEl,
  duplicateModeUserEl,
  duplicateCancelBtnEl,
  duplicateConfirmBtnEl,
  confirmModalEl,
  confirmCancelBtnEl,
  confirmOkBtnEl,
  voiceHistoryModalEl,
  voiceHistoryBtnEl,
  voiceHistoryCloseBtnEl,
  clearVoiceHistoryBtnEl,
  shortcutsModalEl,
  shortcutsHelpBtnEl,
  shortcutsCloseBtnEl,
  onboardingModalEl,
  onboardingBtnEl,
  onboardingRunChecksBtnEl,
  onboardingSkipBtnEl,
  onboardingCompleteBtnEl,
  newChatBtnEl,
  newChatBtnMobileEl,
  renameBtnEl,
  renameBtnMobileEl,
  favoriteBtnEl,
  archiveBtnEl,
  tagsBtnEl,
  systemPromptBtnEl,
  duplicateBtnEl,
  duplicateBtnMobileEl,
  deleteBtnEl,
  deleteBtnMobileEl,
  exportBtnEl,
  exportBtnMobileEl,
  exportJsonBtnEl,
  exportJsonBtnMobileEl,
  exportAllJsonBtnEl,
  exportAllJsonBtnMobileEl,
  exportFavoritesMdBtnEl,
  exportFavoritesMdBtnMobileEl,
  importJsonBtnEl,
  importJsonBtnMobileEl,
  backupBtnEl,
  backupBtnMobileEl,
  restoreBackupBtnEl,
  restoreBackupBtnMobileEl,
  darkModeBtnEl,
  statusRetryBtnEl,
  searchBtnEl,
  searchInputEl,
  searchClearBtnEl,
  searchPrevBtnEl,
  searchNextBtnEl,
  searchRoleEl,
  searchFromEl,
  searchToEl,
  chatListLoadMoreBtnEl,
  telemetryOptInEl,
  telemetryStatsBtnEl,
  auditExportBtnEl,
  configHistoryBtnEl,
  diagnosticsExportBtnEl,
  healthRefreshBtnEl,
  storageRefreshBtnEl,
  storageCleanupBtnEl,
  storageLimitBtnEl,
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
  enviar,
  createNewChat,
  renameActiveChat,
  toggleFavoriteActiveChat,
  toggleArchiveActiveChat,
  editTagsActiveChat,
  editChatSystemPrompt,
  duplicateActiveChat,
  deleteActiveChat,
  exportChat,
  exportChatJson,
  exportAllChatsJson,
  exportFavoriteChatsMarkdown,
  importChatJson,
  exportFullBackup,
  restoreFullBackup,
  openVoiceHistoryModalWithRender,
  cycleThemeMode,
  saveThemeForCurrentUser,
  openOnboardingModal,
  closeOnboardingModal,
  runOnboardingChecks,
  checkOllamaStatus,
  loadStorageUsage,
  runStorageCleanup,
  updateStorageLimitForCurrentUser,
  setTelemetryEnabled,
  showTelemetryStats,
  exportAuditLogsJson,
  openConfigHistoryRollback,
  exportDiagnosticsPackage,
  loadChats,
  runHistorySearch,
  clearSearchResults,
});

function renderUsers() {
  profilesController.renderUsers();
}

function getCurrentUser() {
  return (state.users || []).find((user) => user.id === state.userId) || null;
}

function updateThemeToggleUi(mode) {
  themeLocalController.updateToggleUi(mode);
}

function cycleThemeMode() {
  return themeLocalController.cycleMode();
}

async function saveThemeForCurrentUser(theme) {
  await preferencesController.saveThemeForCurrentUser(theme);
}

function syncThemeFromCurrentUser() {
  preferencesController.syncThemeFromCurrentUser();
}

async function loadUsers() {
  await profilesController.loadUsers();
}

async function switchUser(userId) {
  await profilesController.switchUser(userId);
}

async function createProfile() {
  await profilesController.createProfile();
}

async function renameCurrentProfile() {
  await profilesController.renameCurrentProfile();
}

async function deleteCurrentProfile() {
  await profilesController.deleteCurrentProfile();
}

function buildChatsQueryString() {
  return chatListController.buildQueryString();
}

function updateChatListPaginationUi() {
  chatListController.updatePaginationUi();
}

function resetChatListPagination(options = {}) {
  chatListController.resetPagination(options);
}

function scheduleChatListSearch() {
  chatListController.scheduleSearch();
}

function renderStorageUsage() {
  storageController.renderUsage();
}

async function loadStorageUsage() {
  await storageController.loadUsage();
}

async function runStorageCleanup() {
  await storageController.runCleanup();
}

async function updateStorageLimitForCurrentUser() {
  await storageController.updateLimitForCurrentUser();
}

function updateFilterUi() {
  chatFiltersController.updateUi();
}

async function setFilterMode(mode) {
  await chatFiltersController.setMode(mode);
}

async function loadTelemetryState() {
  await telemetryAdminController.loadTelemetryState();
}

async function checkOllamaStatus() {
  return healthStatusController.checkHealth();
}

async function setTelemetryEnabled(enabled) {
  await telemetryAdminController.setTelemetryEnabled(enabled);
}

async function showTelemetryStats() {
  await telemetryAdminController.showTelemetryStats();
}

async function exportAuditLogsJson() {
  await telemetryAdminController.exportAuditLogsJson();
}

async function exportDiagnosticsPackage() {
  await telemetryAdminController.exportDiagnosticsPackage();
}

async function openConfigHistoryRollback() {
  await telemetryAdminController.openConfigHistoryRollback();
}

function getCurrentUserRole() {
  return rbacController.getCurrentUserRole();
}

function hasRole(minimumRole) {
  return rbacController.hasRole(minimumRole);
}

function updateRbacUi() {
  rbacController.updateUi();
}


function clearSearchResults() {
  historySearchController.clearSearchResults();
}

function renderRagStatus() {
  ragController.renderStatus();
}

async function loadRagDocuments() {
  await ragController.loadDocuments();
}

async function uploadRagDocuments() {
  await ragController.uploadDocuments();
}

async function runHistorySearch({ resetPage = false } = {}) {
  await historySearchController.runHistorySearch({ resetPage });
}

function getPreferredModel() {
  return preferencesController.getPreferredModel();
}

function savePreferredModel(model) {
  preferencesController.savePreferredModel(model);
}

function applyPreferredModel() {
  preferencesController.applyPreferredModel();
}

function resetOnboardingStatus() {
  onboardingController.resetStatus();
}

function syncOnboardingModels() {
  onboardingController.syncModels();
}

function closeOnboardingModal() {
  onboardingController.closeModal();
}

function openOnboardingModal() {
  onboardingController.openModal();
}

async function runOnboardingChecks() {
  await onboardingController.runChecks();
}

function smoothScrollToBottom() {
  chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: "smooth" });
}

function uid() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function showTyping() {
  chatRenderController.showTyping();
}

function hideTyping() {
  chatRenderController.hideTyping();
}

function createAvatar(role) {
  return chatRenderController.createAvatar(role);
}

function appendMessage(role, content, options = {}) {
  return chatRenderController.appendMessage(role, content, options);
}

function renderTabs() {
  chatRenderController.renderTabs();
}

async function loadChats(options = {}) {
  return chatNavigationController.loadChats(options);
}

async function loadMessages(chatId) {
  return chatNavigationController.loadMessages(chatId);
}

async function switchChat(chatId) {
  return chatNavigationController.switchChat(chatId);
}

async function createNewChat(title = "Nova conversa") {
  return chatNavigationController.createNewChat(title);
}

async function renameActiveChat() {
  await chatActionsController.renameActiveChat();
}

async function toggleFavoriteActiveChat() {
  await chatActionsController.toggleFavoriteActiveChat();
}

async function toggleArchiveActiveChat() {
  await chatActionsController.toggleArchiveActiveChat();
}

async function editTagsActiveChat() {
  await chatActionsController.editTagsActiveChat();
}

async function editChatSystemPrompt() {
  await chatActionsController.editChatSystemPrompt();
}

function navigateRelativeTab(step) {
  return chatNavigationController.navigateRelativeTab(step);
}

async function editUserDefaultSystemPrompt() {
  await chatUtilsController.editUserDefaultSystemPrompt();
}

async function duplicateActiveChat() {
  await chatActionsController.duplicateActiveChat();
}

async function deleteActiveChat() {
  await chatActionsController.deleteActiveChat();
}

function getControls() {
  return chatUtilsController.getControls();
}

async function enviar() {
  await chatSendController.enviar();
  updateSendButtonState();
}

async function resetar() {
  await chatUtilsController.resetar();
}

async function exportChat() {
  await chatExportController.exportChat();
}

async function exportFavoriteChatsMarkdown() {
  await chatExportController.exportFavoriteChatsMarkdown();
}

async function exportChatJson() {
  await chatExportController.exportChatJson();
}

async function importChatJson() {
  await chatExportController.importChatJson();
}

async function exportAllChatsJson() {
  await chatExportController.exportAllChatsJson();
}

async function exportFullBackup() {
  await backupController.exportFullBackup();
}

async function restoreFullBackup() {
  await backupController.restoreFullBackup();
}

function setupVoiceInput() {
  voiceController.setupInput();
}

function saveVoiceHistory(text) {
  voiceController.saveHistory(text);
}

function loadVoiceHistory() {
  voiceController.loadHistory();
}

function renderVoiceHistory() {
  voiceController.renderHistory();
}

function openVoiceHistoryModalWithRender() {
  voiceController.openHistoryModalWithRender();
}

function updateSendButtonState() {
  appBindingsController.updateSendButtonState();
}

function setupDragAndDrop() {
  chatUtilsController.setupDragAndDrop();
}

function loadDarkMode() {
  themeLocalController.loadSavedMode();
}

appBindingsController.bindAll();

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
