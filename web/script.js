import { createApiClient } from "./app/shared/api.js";
import { createBackupController } from "./app/shared/backup.js";
import { createAppBindingsController } from "./app/shared/app-bindings.js";
import { createAppRuntimeController } from "./app/shared/app-runtime.js";
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

function createElementRefs(elementIds) {
  return Object.fromEntries(
    elementIds.map(id => [id + "El", document.getElementById(id)])
  );
}

const DOM_ELEMENT_IDS = [
  "chat", "msg", "typing", "sendBtn", "chatTabs", "newChatBtn", "exportBtn",
  "exportJsonBtn", "exportAllJsonBtn", "exportFavoritesMdBtn", "importJsonBtn",
  "chatTabsMobile", "newChatBtnMobile", "duplicateBtn", "duplicateBtnMobile",
  "renameBtn", "deleteBtn", "systemPromptBtn", "renameBtnMobile", "deleteBtnMobile",
  "exportBtnMobile", "exportJsonBtnMobile", "exportAllJsonBtnMobile",
  "exportFavoritesMdBtnMobile", "backupBtn", "restoreBackupBtn", "backupBtnMobile",
  "restoreBackupBtnMobile", "backupRestoreInput", "importJsonBtnMobile", "voiceBtn",
  "voiceHistoryBtn", "imageInput", "favoriteBtn", "archiveBtn", "tagsBtn",
  "duplicateModal", "duplicateTitleInput", "duplicateModeFull", "duplicateModeUser",
  "duplicateCancelBtn", "duplicateConfirmBtn", "voiceHistoryModal", "voiceHistoryList",
  "voiceHistoryCloseBtn", "clearVoiceHistoryBtn", "confirmModal", "confirmModalText",
  "confirmCancelBtn", "confirmOkBtn", "onboardingModal", "ollamaStatusBadge",
  "systemHealthBadge", "ollamaLatencyText", "statusBar", "statusText", "statusRetryBtn",
  "userPromptBtn", "shortcutsHelpBtn", "shortcutsModal", "shortcutsCloseBtn",
  "shortcutsList", "userSelect", "darkModeBtn", "sunIcon", "moonIcon", "autoIcon",
  "storageUsageText", "storageAlertText", "storageRefreshBtn", "storageCleanupBtn",
  "storageLimitBtn", "telemetryOptIn", "telemetryStatsBtn", "auditExportBtn",
  "configHistoryBtn", "diagnosticsExportBtn", "healthRefreshBtn", "healthSummaryText",
  "healthChecksText", "healthSloText", "filterAllBtn", "filterFavoritesBtn",
  "filterArchivedBtn", "filterTagInput", "filterTagApplyBtn", "chatListSearchInput",
  "chatListPaginationInfo", "chatListLoadMoreBtn", "searchInput", "searchRole",
  "searchFrom", "searchTo", "searchBtn", "searchClearBtn", "searchPageInfo",
  "searchPrevBtn", "searchNextBtn", "searchResults", "ragToggle", "docInput",
  "docUploadBtn", "ragStatus", "newUserBtn", "renameUserBtn", "deleteUserBtn",
  "onboardingBtn", "onboardingModelSelect", "onboardingHealthStatus",
  "onboardingSmokeStatus", "onboardingRunChecksBtn", "onboardingSkipBtn",
  "onboardingCompleteBtn",
];

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
} = createElementRefs(DOM_ELEMENT_IDS);
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
    chatNavigationController.loadChats().catch(console.error);
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
  getFallbackModel: () => chatUtilsController.getControls().model,
  savePreferredModel: (model) => preferencesController.savePreferredModel(model),
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
    await telemetryAdminController.loadTelemetryState();
    await profilesController.loadUsers();
    await chatNavigationController.loadChats();
  },
});

const getCurrentUser = () => appRuntimeController.getCurrentUser();

const rbacController = createRbacController({
  getCurrentUser,
});

const preferencesController = createPreferencesController({
  state,
  fetchJson,
  getCurrentUser,
  getMainModelSelect: () => document.getElementById("modelo"),
  applyThemeMode,
});

const loadChats = () => chatNavigationController.loadChats();
const loadUsers = () => profilesController.loadUsers();
const loadRagDocuments = () => ragController.loadDocuments();
const resetChatListPagination = () => chatListController.resetPagination();
const hideTyping = () => chatRenderController.hideTyping();
const smoothScrollToBottom = () => appRuntimeController.smoothScrollToBottom();

const profilesController = createProfilesController({
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
});

const storageController = createStorageController({
  state,
  storageUsageTextEl,
  storageAlertTextEl,
  fetchJson,
  formatBytes,
  openConfirmModal,
  showStatus,
  onLoadUsers: loadUsers,
});

const chatFiltersController = createChatFiltersController({
  state,
  filterAllBtnEl,
  filterFavoritesBtnEl,
  filterArchivedBtnEl,
  filterTagInputEl,
  onResetPagination: resetChatListPagination,
  onLoadChats: loadChats,
});

const chatExportController = createChatExportController({
  state,
  apiBase: API_BASE,
  fetchJson,
  showStatus,
  onLoadChats: loadChats,
  onLoadMessages: (chatId) => chatNavigationController.loadMessages(chatId),
});

const chatActionsController = createChatActionsController({
  state,
  fetchJson,
  showStatus,
  openConfirmModal,
  openDuplicateModal,
  uid: () => appRuntimeController.uid(),
  onLoadChats: loadChats,
  onSwitchChat: (chatId) => chatNavigationController.switchChat(chatId),
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
});

const chatRenderController = createChatRenderController({
  state,
  chatEl,
  typingEl,
  tabsEl,
  tabsMobileEl,
  favoriteBtnEl,
  archiveBtnEl,
  switchChat: (chatId) => chatNavigationController.switchChat(chatId),
  smoothScrollToBottom,
  updateChatListPaginationUi: () => chatListController.updatePaginationUi(),
});

const chatNavigationController = createChatNavigationController({
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
});

const backupController = createBackupController({
  apiBase: API_BASE,
  backupRestoreInputEl,
  fetchJson,
  showStatus,
  openConfirmModal,
  onLoadUsers: loadUsers,
  onLoadChats: loadChats,
  onLoadRagDocuments: loadRagDocuments,
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
  onUpdateSendButtonState: () => appBindingsController.updateSendButtonState(),
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
  onCreateNewChat: () => chatNavigationController.createNewChat().catch(console.error),
  onNavigateRelativeTab: (step) => chatNavigationController.navigateRelativeTab(step),
  onDuplicateActiveChat: () => chatActionsController.duplicateActiveChat().catch(console.error),
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

const appRuntimeController = createAppRuntimeController({
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
});

async function enviarComAtualizacao() {
  await chatSendController.enviar();
  appBindingsController.updateSendButtonState();
}

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
  enviar: enviarComAtualizacao,
  createNewChat: chatNavigationController.createNewChat,
  renameActiveChat: chatActionsController.renameActiveChat,
  toggleFavoriteActiveChat: chatActionsController.toggleFavoriteActiveChat,
  toggleArchiveActiveChat: chatActionsController.toggleArchiveActiveChat,
  editTagsActiveChat: chatActionsController.editTagsActiveChat,
  editChatSystemPrompt: chatActionsController.editChatSystemPrompt,
  duplicateActiveChat: chatActionsController.duplicateActiveChat,
  deleteActiveChat: chatActionsController.deleteActiveChat,
  exportChat: chatExportController.exportChat,
  exportChatJson: chatExportController.exportChatJson,
  exportAllChatsJson: chatExportController.exportAllChatsJson,
  exportFavoriteChatsMarkdown: chatExportController.exportFavoriteChatsMarkdown,
  importChatJson: chatExportController.importChatJson,
  exportFullBackup: backupController.exportFullBackup,
  restoreFullBackup: backupController.restoreFullBackup,
  openVoiceHistoryModalWithRender: voiceController.openHistoryModalWithRender,
  cycleThemeMode: themeLocalController.cycleMode,
  saveThemeForCurrentUser: preferencesController.saveThemeForCurrentUser,
  openOnboardingModal: onboardingController.openModal,
  closeOnboardingModal: onboardingController.closeModal,
  runOnboardingChecks: onboardingController.runChecks,
  checkOllamaStatus: healthStatusController.checkHealth,
  loadStorageUsage: storageController.loadUsage,
  runStorageCleanup: storageController.runCleanup,
  updateStorageLimitForCurrentUser: storageController.updateLimitForCurrentUser,
  setTelemetryEnabled: telemetryAdminController.setTelemetryEnabled,
  showTelemetryStats: telemetryAdminController.showTelemetryStats,
  exportAuditLogsJson: telemetryAdminController.exportAuditLogsJson,
  openConfigHistoryRollback: telemetryAdminController.openConfigHistoryRollback,
  exportDiagnosticsPackage: telemetryAdminController.exportDiagnosticsPackage,
  loadChats: chatNavigationController.loadChats,
  runHistorySearch: historySearchController.runHistorySearch,
  clearSearchResults: historySearchController.clearSearchResults,
});

appBindingsController.bindAll();

window.enviar = enviarComAtualizacao;
window.resetar = async () => {
  await chatUtilsController.resetar();
};

(async function bootstrap() {
  await appRuntimeController.bootstrap();
})();
