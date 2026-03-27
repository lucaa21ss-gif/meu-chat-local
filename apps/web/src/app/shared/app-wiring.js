export function buildStatusPresenterDeps({
  statusBarEl,
  statusTextEl,
  statusRetryBtnEl,
}) {
  return {
    statusBarEl,
    statusTextEl,
    statusRetryBtnEl,
  };
}

export function buildModalPresenterDeps({
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
}) {
  return {
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
  };
}

export function buildAppBindingsElements(elements) {
  return {
    inputEl: elements.inputEl,
    sendBtnEl: elements.sendBtnEl,
    tabsEl: elements.tabsEl,
    duplicateModalEl: elements.duplicateModalEl,
    duplicateTitleInputEl: elements.duplicateTitleInputEl,
    duplicateModeUserEl: elements.duplicateModeUserEl,
    duplicateCancelBtnEl: elements.duplicateCancelBtnEl,
    duplicateConfirmBtnEl: elements.duplicateConfirmBtnEl,
    confirmModalEl: elements.confirmModalEl,
    confirmCancelBtnEl: elements.confirmCancelBtnEl,
    confirmOkBtnEl: elements.confirmOkBtnEl,
    voiceHistoryModalEl: elements.voiceHistoryModalEl,
    voiceHistoryBtnEl: elements.voiceHistoryBtnEl,
    voiceHistoryCloseBtnEl: elements.voiceHistoryCloseBtnEl,
    clearVoiceHistoryBtnEl: elements.clearVoiceHistoryBtnEl,
    shortcutsModalEl: elements.shortcutsModalEl,
    shortcutsHelpBtnEl: elements.shortcutsHelpBtnEl,
    shortcutsCloseBtnEl: elements.shortcutsCloseBtnEl,
    onboardingModalEl: elements.onboardingModalEl,
    onboardingBtnEl: elements.onboardingBtnEl,
    onboardingRunChecksBtnEl: elements.onboardingRunChecksBtnEl,
    onboardingSkipBtnEl: elements.onboardingSkipBtnEl,
    onboardingCompleteBtnEl: elements.onboardingCompleteBtnEl,
    newChatBtnEl: elements.newChatBtnEl,
    newChatBtnMobileEl: elements.newChatBtnMobileEl,
    renameBtnEl: elements.renameBtnEl,
    renameBtnMobileEl: elements.renameBtnMobileEl,
    favoriteBtnEl: elements.favoriteBtnEl,
    archiveBtnEl: elements.archiveBtnEl,
    tagsBtnEl: elements.tagsBtnEl,
    systemPromptBtnEl: elements.systemPromptBtnEl,
    duplicateBtnEl: elements.duplicateBtnEl,
    duplicateBtnMobileEl: elements.duplicateBtnMobileEl,
    deleteBtnEl: elements.deleteBtnEl,
    deleteBtnMobileEl: elements.deleteBtnMobileEl,
    exportBtnEl: elements.exportBtnEl,
    exportBtnMobileEl: elements.exportBtnMobileEl,
    exportJsonBtnEl: elements.exportJsonBtnEl,
    exportJsonBtnMobileEl: elements.exportJsonBtnMobileEl,
    exportAllJsonBtnEl: elements.exportAllJsonBtnEl,
    exportAllJsonBtnMobileEl: elements.exportAllJsonBtnMobileEl,
    exportFavoritesMdBtnEl: elements.exportFavoritesMdBtnEl,
    exportFavoritesMdBtnMobileEl: elements.exportFavoritesMdBtnMobileEl,
    importJsonBtnEl: elements.importJsonBtnEl,
    importJsonBtnMobileEl: elements.importJsonBtnMobileEl,
    backupBtnEl: elements.backupBtnEl,
    backupBtnMobileEl: elements.backupBtnMobileEl,
    restoreBackupBtnEl: elements.restoreBackupBtnEl,
    restoreBackupBtnMobileEl: elements.restoreBackupBtnMobileEl,
    darkModeBtnEl: elements.darkModeBtnEl,
    statusRetryBtnEl: elements.statusRetryBtnEl,
    searchBtnEl: elements.searchBtnEl,
    searchInputEl: elements.searchInputEl,
    searchClearBtnEl: elements.searchClearBtnEl,
    searchPrevBtnEl: elements.searchPrevBtnEl,
    searchNextBtnEl: elements.searchNextBtnEl,
    searchRoleEl: elements.searchRoleEl,
    searchFromEl: elements.searchFromEl,
    searchToEl: elements.searchToEl,
    chatListLoadMoreBtnEl: elements.chatListLoadMoreBtnEl,
    telemetryOptInEl: elements.telemetryOptInEl,
    telemetryStatsBtnEl: elements.telemetryStatsBtnEl,
    auditExportBtnEl: elements.auditExportBtnEl,
    configHistoryBtnEl: elements.configHistoryBtnEl,
    diagnosticsExportBtnEl: elements.diagnosticsExportBtnEl,
    healthRefreshBtnEl: elements.healthRefreshBtnEl,
    storageRefreshBtnEl: elements.storageRefreshBtnEl,
    storageCleanupBtnEl: elements.storageCleanupBtnEl,
    storageLimitBtnEl: elements.storageLimitBtnEl,
  };
}

export function buildAppBindingsControllers({
  shortcutsController,
  onboardingController,
  voiceController,
  statusPresenter,
}) {
  return {
    shortcutsController,
    onboardingController,
    voiceController,
    statusPresenter,
  };
}

export function buildAppBindingsModalControls({
  closeDuplicateModal,
  closeConfirmModal,
  closeShortcutsModal,
  closeVoiceHistoryModal,
  openConfirmModal,
  openShortcutsModal,
  showStatus,
}) {
  return {
    closeDuplicateModal,
    closeConfirmModal,
    closeShortcutsModal,
    closeVoiceHistoryModal,
    openConfirmModal,
    openShortcutsModal,
    showStatus,
  };
}

export function buildAppBindingsActions({
  enviar,
  chatNavigationController,
  chatActionsController,
  chatExportController,
  backupController,
  voiceController,
  themeLocalController,
  preferencesController,
  onboardingController,
  healthStatusController,
  storageController,
  telemetryAdminController,
  historySearchController,
}) {
  return {
    enviar,
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
  };
}

export function buildAppBindingsDeps({
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
  enviar,
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
}) {
  return {
    state,
    elements: buildAppBindingsElements(elements),
    controllers: buildAppBindingsControllers({
      shortcutsController,
      onboardingController,
      voiceController,
      statusPresenter,
    }),
    modalControls: buildAppBindingsModalControls({
      closeDuplicateModal,
      closeConfirmModal,
      closeShortcutsModal,
      closeVoiceHistoryModal,
      openConfirmModal,
      openShortcutsModal,
      showStatus,
    }),
    actions: buildAppBindingsActions({
      enviar,
      chatNavigationController,
      chatActionsController,
      chatExportController,
      backupController,
      voiceController,
      themeLocalController,
      preferencesController,
      onboardingController,
      healthStatusController,
      storageController,
      telemetryAdminController,
      historySearchController,
    }),
  };
}

export function buildChatListControllerDeps({
  state,
  chatListPaginationInfoEl,
  chatListLoadMoreBtnEl,
  onScheduledSearch,
}) {
  return {
    state,
    chatListPaginationInfoEl,
    chatListLoadMoreBtnEl,
    onScheduledSearch,
  };
}

export function buildHistorySearchDeps({
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
  getActiveChatId,
}) {
  return {
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
    getActiveChatId,
  };
}

export function buildOnboardingDeps({
  state,
  apiBase,
  onboardingModalEl,
  onboardingModelSelectEl,
  onboardingHealthStatusEl,
  onboardingSmokeStatusEl,
  getMainModelSelect,
  getFallbackModel,
  savePreferredModel,
  showStatus,
}) {
  return {
    state,
    apiBase,
    onboardingModalEl,
    onboardingModelSelectEl,
    onboardingHealthStatusEl,
    onboardingSmokeStatusEl,
    getMainModelSelect,
    getFallbackModel,
    savePreferredModel,
    showStatus,
  };
}

export function buildHealthStatusDeps({
  state,
  fetchJson,
  buildHeaderPresentation,
  ollamaStatusBadgeEl,
  systemHealthBadgeEl,
  ollamaLatencyTextEl,
  healthSummaryTextEl,
  healthChecksTextEl,
  healthSloTextEl,
}) {
  return {
    state,
    fetchJson,
    buildHeaderPresentation,
    ollamaStatusBadgeEl,
    systemHealthBadgeEl,
    ollamaLatencyTextEl,
    healthSummaryTextEl,
    healthChecksTextEl,
    healthSloTextEl,
  };
}

export function buildTelemetryAdminDeps({
  state,
  apiBase,
  fetchJson,
  telemetryOptInEl,
  showStatus,
  formatDateLabel,
  onAfterConfigRollback,
}) {
  return {
    state,
    apiBase,
    fetchJson,
    telemetryOptInEl,
    showStatus,
    formatDateLabel,
    onAfterConfigRollback,
  };
}

export function buildPreferencesDeps({
  state,
  fetchJson,
  getCurrentUser,
  getMainModelSelect,
  applyThemeMode,
}) {
  return {
    state,
    fetchJson,
    getCurrentUser,
    getMainModelSelect,
    applyThemeMode,
  };
}

export function buildProfilesDeps({
  state,
  userSelectEl,
  fetchJson,
  showStatus,
  onSyncThemeFromCurrentUser,
  onUpdateRbacUi,
  onLoadStorageUsage,
  onLoadChats,
  onLoadRagDocuments,
  onResetChatListPagination,
}) {
  return {
    state,
    userSelectEl,
    fetchJson,
    showStatus,
    onSyncThemeFromCurrentUser,
    onUpdateRbacUi,
    onLoadStorageUsage,
    onLoadChats,
    onLoadRagDocuments,
    onResetChatListPagination,
  };
}

export function buildStorageDeps({
  state,
  storageUsageTextEl,
  storageAlertTextEl,
  fetchJson,
  formatBytes,
  openConfirmModal,
  showStatus,
  onLoadUsers,
}) {
  return {
    state,
    storageUsageTextEl,
    storageAlertTextEl,
    fetchJson,
    formatBytes,
    openConfirmModal,
    showStatus,
    onLoadUsers,
  };
}

export function buildChatFiltersDeps({
  state,
  filterAllBtnEl,
  filterFavoritesBtnEl,
  filterArchivedBtnEl,
  filterTagInputEl,
  onResetPagination,
  onLoadChats,
}) {
  return {
    state,
    filterAllBtnEl,
    filterFavoritesBtnEl,
    filterArchivedBtnEl,
    filterTagInputEl,
    onResetPagination,
    onLoadChats,
  };
}

export function buildChatExportDeps({
  state,
  apiBase,
  fetchJson,
  showStatus,
  onLoadChats,
  onLoadMessages,
}) {
  return {
    state,
    apiBase,
    fetchJson,
    showStatus,
    onLoadChats,
    onLoadMessages,
  };
}

export function buildChatActionsDeps({
  state,
  fetchJson,
  showStatus,
  openConfirmModal,
  openDuplicateModal,
  uid,
  onLoadChats,
  onSwitchChat,
}) {
  return {
    state,
    fetchJson,
    showStatus,
    openConfirmModal,
    openDuplicateModal,
    uid,
    onLoadChats,
    onSwitchChat,
  };
}

export function buildChatSendDeps({
  state,
  inputEl,
  imageInputEl,
  sendBtnEl,
  ragToggleEl,
  apiBase,
  fetchJson,
  filesToBase64,
  appendMessage,
  showTyping,
  hideTyping,
  smoothScrollToBottom,
  showStatus,
  hideStatus,
  getControls,
  onEnsureActiveChat,
  onLoadChats,
  getRetryAction,
}) {
  return {
    state,
    inputEl,
    imageInputEl,
    sendBtnEl,
    ragToggleEl,
    apiBase,
    fetchJson,
    filesToBase64,
    appendMessage,
    showTyping,
    hideTyping,
    smoothScrollToBottom,
    showStatus,
    hideStatus,
    getControls,
    onEnsureActiveChat,
    onLoadChats,
    getRetryAction,
  };
}

export function buildChatRenderDeps({
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
}) {
  return {
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
  };
}

export function buildChatNavigationDeps({
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
}) {
  return {
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
  };
}

export function buildBackupDeps({
  apiBase,
  backupRestoreInputEl,
  fetchJson,
  showStatus,
  openConfirmModal,
  onLoadUsers,
  onLoadChats,
  onLoadRagDocuments,
}) {
  return {
    apiBase,
    backupRestoreInputEl,
    fetchJson,
    showStatus,
    openConfirmModal,
    onLoadUsers,
    onLoadChats,
    onLoadRagDocuments,
  };
}

export function buildThemeLocalDeps({
  state,
  darkModeBtnEl,
  sunIconEl,
  moonIconEl,
  autoIconEl,
  applyThemeMode,
}) {
  return {
    state,
    darkModeBtnEl,
    sunIconEl,
    moonIconEl,
    autoIconEl,
    applyThemeMode,
  };
}

export function buildVoiceDeps({
  state,
  inputEl,
  voiceBtnEl,
  voiceHistoryListEl,
  openVoiceHistoryModal,
  closeVoiceHistoryModal,
  onUpdateSendButtonState,
}) {
  return {
    state,
    inputEl,
    voiceBtnEl,
    voiceHistoryListEl,
    openVoiceHistoryModal,
    closeVoiceHistoryModal,
    onUpdateSendButtonState,
  };
}

export function buildRagDeps({
  state,
  ragStatusEl,
  docInputEl,
  fetchJson,
  filesToDocuments,
  showStatus,
  getActiveChatId,
}) {
  return {
    state,
    ragStatusEl,
    docInputEl,
    fetchJson,
    filesToDocuments,
    showStatus,
    getActiveChatId,
  };
}

export function buildShortcutsDeps({
  shortcutsListEl,
  inputEl,
  searchInputEl,
  openShortcutsModal,
  closeShortcutsModal,
  isShortcutsModalOpen,
  hasBlockingModalOpen,
  hasDuplicatePending,
  closeDuplicateModal,
  hasConfirmPending,
  closeConfirmModal,
  isVoiceHistoryOpen,
  closeVoiceHistoryModal,
  isOnboardingOpen,
  closeOnboardingModal,
  onCreateNewChat,
  onNavigateRelativeTab,
  onDuplicateActiveChat,
}) {
  return {
    shortcutsListEl,
    inputEl,
    searchInputEl,
    openShortcutsModal,
    closeShortcutsModal,
    isShortcutsModalOpen,
    hasBlockingModalOpen,
    hasDuplicatePending,
    closeDuplicateModal,
    hasConfirmPending,
    closeConfirmModal,
    isVoiceHistoryOpen,
    closeVoiceHistoryModal,
    isOnboardingOpen,
    closeOnboardingModal,
    onCreateNewChat,
    onNavigateRelativeTab,
    onDuplicateActiveChat,
  };
}

export function buildChatUtilsDeps({
  state,
  fetchJson,
  chatEl,
  imageInputEl,
  hideTyping,
  loadUsers,
  loadChats,
  showStatus,
  openConfirmModal,
}) {
  return {
    state,
    fetchJson,
    chatEl,
    imageInputEl,
    hideTyping,
    loadUsers,
    loadChats,
    showStatus,
    openConfirmModal,
  };
}

export function buildAppRuntimeDeps({
  state,
  chatEl,
  createHealthPoller,
  checkOllamaStatus,
  loadDarkMode,
  applyPreferredModel,
  loadVoiceHistory,
  setupVoiceInput,
  setupDragAndDrop,
  updateSendButtonState,
  updateFilterUi,
  renderStorageUsage,
  loadTelemetryState,
  loadUsers,
  loadChats,
  loadRagDocuments,
  openOnboardingModal,
}) {
  return {
    state,
    chatEl,
    createHealthPoller,
    checkOllamaStatus,
    loadDarkMode,
    applyPreferredModel,
    loadVoiceHistory,
    setupVoiceInput,
    setupDragAndDrop,
    updateSendButtonState,
    updateFilterUi,
    renderStorageUsage,
    loadTelemetryState,
    loadUsers,
    loadChats,
    loadRagDocuments,
    openOnboardingModal,
  };
}