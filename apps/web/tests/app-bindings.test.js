import test from "node:test";
import assert from "node:assert/strict";

import { bindPairedActionButtons } from "../src/app/shared/app-bindings-actions.js";
import {
  bindAdminTelemetryButtons,
  bindHealthStorageButtons,
} from "../src/app/shared/app-bindings-admin.js";
import {
  bindChatListButtons,
  bindStatusRetryButton,
} from "../src/app/shared/app-bindings-runtime.js";
import { bindCoreInputBindings } from "../src/app/shared/app-bindings-core.js";
import { createAppBindingsController } from "../src/app/shared/app-bindings.js";
import { buildAppBindingsDeps } from "../src/app/shared/app-wiring.js";
import { bindSearchButtons } from "../src/app/shared/app-bindings-search.js";

function createMockElement() {
  const handlers = new Map();
  return {
    checked: false,
    value: "",
    addEventListener(type, handler) {
      handlers.set(type, handler);
    },
    trigger(type, event = {}) {
      const handler = handlers.get(type);
      if (handler) {
        handler(event);
      }
    },
  };
}

function createAppBindingsFixture() {
  const inputEl = createMockElement();
  const sendBtnEl = createMockElement();
  const statusRetryBtnEl = createMockElement();
  const tabsEl = createMockElement();
  tabsEl.scrollTop = 240;
  const chatListLoadMoreBtnEl = createMockElement();
  sendBtnEl.disabled = true;
  inputEl.value = "";

  const state = {
    search: { query: "", page: 1, totalPages: 1 },
    chatList: { page: 1, totalPages: 3, scrollTop: 0 },
  };

  const stats = {
    sentCount: 0,
    retryCount: 0,
    loadChatsCalls: [],
  };

  const controller = createAppBindingsController({
    state,
    elements: {
      inputEl,
      sendBtnEl,
      tabsEl,
      duplicateModalEl: null,
      duplicateTitleInputEl: createMockElement(),
      duplicateModeUserEl: createMockElement(),
      duplicateCancelBtnEl: null,
      duplicateConfirmBtnEl: null,
      confirmModalEl: null,
      confirmCancelBtnEl: null,
      confirmOkBtnEl: null,
      voiceHistoryModalEl: null,
      voiceHistoryBtnEl: null,
      voiceHistoryCloseBtnEl: null,
      clearVoiceHistoryBtnEl: null,
      shortcutsModalEl: null,
      shortcutsHelpBtnEl: null,
      shortcutsCloseBtnEl: null,
      onboardingModalEl: null,
      onboardingBtnEl: null,
      onboardingRunChecksBtnEl: null,
      onboardingSkipBtnEl: null,
      onboardingCompleteBtnEl: null,
      newChatBtnEl: null,
      newChatBtnMobileEl: null,
      renameBtnEl: null,
      renameBtnMobileEl: null,
      favoriteBtnEl: null,
      archiveBtnEl: null,
      tagsBtnEl: null,
      systemPromptBtnEl: null,
      duplicateBtnEl: null,
      duplicateBtnMobileEl: null,
      deleteBtnEl: null,
      deleteBtnMobileEl: null,
      exportBtnEl: null,
      exportBtnMobileEl: null,
      exportJsonBtnEl: null,
      exportJsonBtnMobileEl: null,
      exportAllJsonBtnEl: null,
      exportAllJsonBtnMobileEl: null,
      exportFavoritesMdBtnEl: null,
      exportFavoritesMdBtnMobileEl: null,
      importJsonBtnEl: null,
      importJsonBtnMobileEl: null,
      backupBtnEl: null,
      backupBtnMobileEl: null,
      restoreBackupBtnEl: null,
      restoreBackupBtnMobileEl: null,
      darkModeBtnEl: null,
      statusRetryBtnEl,
      searchBtnEl: null,
      searchInputEl: null,
      searchClearBtnEl: null,
      searchPrevBtnEl: null,
      searchNextBtnEl: null,
      searchRoleEl: null,
      searchFromEl: null,
      searchToEl: null,
      chatListLoadMoreBtnEl,
      telemetryOptInEl: null,
      telemetryStatsBtnEl: null,
      auditExportBtnEl: null,
      configHistoryBtnEl: null,
      diagnosticsExportBtnEl: null,
      healthRefreshBtnEl: null,
      storageRefreshBtnEl: null,
      storageCleanupBtnEl: null,
      storageLimitBtnEl: null,
    },
    controllers: {
      shortcutsController: {
        handleGlobalShortcuts() {},
        renderShortcutsHelp() {},
      },
      onboardingController: {
        handleBackdropClick() {},
        complete() {},
      },
      voiceController: {
        clearHistory() {},
      },
      statusPresenter: {
        getRetryAction() {
          return async () => {
            stats.retryCount += 1;
          };
        },
      },
    },
    modalControls: {
      closeDuplicateModal() {},
      closeConfirmModal() {},
      closeShortcutsModal() {},
      closeVoiceHistoryModal() {},
      openConfirmModal: async () => false,
      openShortcutsModal() {},
      showStatus() {},
    },
    actions: {
      enviar() {
        stats.sentCount += 1;
      },
      createNewChat: async () => {},
      renameActiveChat: async () => {},
      toggleFavoriteActiveChat: async () => {},
      toggleArchiveActiveChat: async () => {},
      editTagsActiveChat: async () => {},
      editChatSystemPrompt: async () => {},
      duplicateActiveChat: async () => {},
      deleteActiveChat: async () => {},
      exportChat: async () => {},
      exportChatJson: async () => {},
      exportAllChatsJson: async () => {},
      exportFavoriteChatsMarkdown: async () => {},
      importChatJson: async () => {},
      exportFullBackup: async () => {},
      restoreFullBackup: async () => {},
      openVoiceHistoryModalWithRender() {},
      cycleThemeMode() {
        return "system";
      },
      saveThemeForCurrentUser: async () => {},
      openOnboardingModal() {},
      closeOnboardingModal() {},
      runOnboardingChecks: async () => {},
      checkOllamaStatus: async () => {},
      loadStorageUsage: async () => {},
      runStorageCleanup: async () => {},
      updateStorageLimitForCurrentUser: async () => {},
      setTelemetryEnabled: async () => {},
      showTelemetryStats: async () => {},
      exportAuditLogsJson: async () => {},
      openConfigHistoryRollback: async () => {},
      exportDiagnosticsPackage: async () => {},
      loadChats: async (options) => {
        stats.loadChatsCalls.push(options);
      },
      runHistorySearch: async () => {},
      clearSearchResults() {},
    },
  });

  return {
    controller,
    state,
    inputEl,
    sendBtnEl,
    statusRetryBtnEl,
    tabsEl,
    chatListLoadMoreBtnEl,
    stats,
  };
}

test("bindCoreInputBindings envia no Enter e registra atalho global", () => {
  const originalDocument = globalThis.document;
  let globalShortcutCalls = 0;
  const documentHandlers = new Map();
  globalThis.document = {
    addEventListener(type, handler) {
      documentHandlers.set(type, handler);
    },
  };

  const inputEl = createMockElement();
  let sentCount = 0;
  let preventedCount = 0;

  bindCoreInputBindings({
    inputEl,
    duplicateModalEl: null,
    confirmModalEl: null,
    shortcutsModalEl: null,
    voiceHistoryModalEl: null,
    onboardingModalEl: null,
    closeDuplicateModal() {},
    closeConfirmModal() {},
    closeShortcutsModal() {},
    closeVoiceHistoryModal() {},
    onboardingController: {
      handleBackdropClick() {},
    },
    shortcutsController: {
      handleGlobalShortcuts() {
        globalShortcutCalls += 1;
      },
    },
    updateSendButtonState() {},
    enviar() {
      sentCount += 1;
    },
  });

  inputEl.trigger("keydown", {
    key: "Enter",
    shiftKey: false,
    preventDefault() {
      preventedCount += 1;
    },
  });
  assert.equal(sentCount, 1);
  assert.equal(preventedCount, 1);

  inputEl.trigger("keydown", {
    key: "Enter",
    shiftKey: true,
    preventDefault() {
      preventedCount += 1;
    },
  });
  assert.equal(sentCount, 1);
  assert.equal(preventedCount, 1);

  const keydownHandler = documentHandlers.get("keydown");
  assert.equal(typeof keydownHandler, "function");
  keydownHandler({ key: "k", ctrlKey: true });
  assert.equal(globalShortcutCalls, 1);

  globalThis.document = originalDocument;
});

test("bindCoreInputBindings aplica fechamento por backdrop nos modais", () => {
  const originalDocument = globalThis.document;
  globalThis.document = {
    addEventListener() {},
  };

  const inputEl = createMockElement();
  const duplicateModalEl = createMockElement();
  const confirmModalEl = createMockElement();
  const shortcutsModalEl = createMockElement();
  const voiceHistoryModalEl = createMockElement();
  const onboardingModalEl = createMockElement();

  const calls = {
    duplicate: 0,
    confirm: 0,
    shortcuts: 0,
    voice: 0,
    onboarding: 0,
  };

  bindCoreInputBindings({
    inputEl,
    duplicateModalEl,
    confirmModalEl,
    shortcutsModalEl,
    voiceHistoryModalEl,
    onboardingModalEl,
    closeDuplicateModal() {
      calls.duplicate += 1;
    },
    closeConfirmModal() {
      calls.confirm += 1;
    },
    closeShortcutsModal() {
      calls.shortcuts += 1;
    },
    closeVoiceHistoryModal() {
      calls.voice += 1;
    },
    onboardingController: {
      handleBackdropClick() {
        calls.onboarding += 1;
      },
    },
    shortcutsController: {
      handleGlobalShortcuts() {},
    },
    updateSendButtonState() {},
    enviar() {},
  });

  duplicateModalEl.trigger("click", { target: duplicateModalEl });
  duplicateModalEl.trigger("click", { target: {} });
  confirmModalEl.trigger("click", { target: confirmModalEl });
  shortcutsModalEl.trigger("click", { target: shortcutsModalEl });
  voiceHistoryModalEl.trigger("click", { target: voiceHistoryModalEl });
  onboardingModalEl.trigger("click", { target: onboardingModalEl });

  assert.equal(calls.duplicate, 1);
  assert.equal(calls.confirm, 1);
  assert.equal(calls.shortcuts, 1);
  assert.equal(calls.voice, 1);
  assert.equal(calls.onboarding, 1);

  globalThis.document = originalDocument;
});

test("bindPairedActionButtons registra desktop e mobile com handler async", async () => {
  const desktop = createMockElement();
  const mobile = createMockElement();
  const calls = [];

  const buttonBinding = {
    bindWithErrorHandling(primary, secondary, action) {
      if (primary) {
        primary.addEventListener("click", () => {
          action().catch(() => {});
        });
      }
      if (secondary) {
        secondary.addEventListener("click", () => {
          action().catch(() => {});
        });
      }
    },
  };

  const dependencies = {
    buttonBinding,
    newChatBtnEl: desktop,
    newChatBtnMobileEl: mobile,
    renameBtnEl: null,
    renameBtnMobileEl: null,
    favoriteBtnEl: null,
    archiveBtnEl: null,
    tagsBtnEl: null,
    systemPromptBtnEl: null,
    duplicateBtnEl: null,
    duplicateBtnMobileEl: null,
    deleteBtnEl: null,
    deleteBtnMobileEl: null,
    exportBtnEl: null,
    exportBtnMobileEl: null,
    exportJsonBtnEl: null,
    exportJsonBtnMobileEl: null,
    exportAllJsonBtnEl: null,
    exportAllJsonBtnMobileEl: null,
    exportFavoritesMdBtnEl: null,
    exportFavoritesMdBtnMobileEl: null,
    importJsonBtnEl: null,
    importJsonBtnMobileEl: null,
    backupBtnEl: null,
    backupBtnMobileEl: null,
    restoreBackupBtnEl: null,
    restoreBackupBtnMobileEl: null,
    createNewChat: async () => calls.push("new"),
    renameActiveChat: async () => calls.push("rename"),
    toggleFavoriteActiveChat: async () => calls.push("fav"),
    toggleArchiveActiveChat: async () => calls.push("archive"),
    editTagsActiveChat: async () => calls.push("tags"),
    editChatSystemPrompt: async () => calls.push("prompt"),
    duplicateActiveChat: async () => calls.push("dup"),
    deleteActiveChat: async () => calls.push("del"),
    exportChat: async () => calls.push("exp"),
    exportChatJson: async () => calls.push("expj"),
    exportAllChatsJson: async () => calls.push("expall"),
    exportFavoriteChatsMarkdown: async () => calls.push("expmd"),
    importChatJson: async () => calls.push("imp"),
    exportFullBackup: async () => calls.push("bkp"),
    restoreFullBackup: async () => calls.push("rbkp"),
  };

  bindPairedActionButtons(dependencies);

  desktop.trigger("click");
  mobile.trigger("click");
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

  assert.deepEqual(calls, ["new", "new"]);
});

test("bindSearchButtons limpa filtros e pagina resultados", async () => {
  const state = {
    search: {
      query: "abc",
      page: 2,
      totalPages: 4,
    },
  };

  const searchBtnEl = createMockElement();
  const searchInputEl = createMockElement();
  const searchClearBtnEl = createMockElement();
  const searchPrevBtnEl = createMockElement();
  const searchNextBtnEl = createMockElement();
  const searchRoleEl = createMockElement();
  const searchFromEl = createMockElement();
  const searchToEl = createMockElement();

  searchInputEl.value = "foo";
  searchRoleEl.value = "assistant";
  searchFromEl.value = "2026-01-01";
  searchToEl.value = "2026-01-31";

  const calls = [];
  bindSearchButtons({
    state,
    searchBtnEl,
    searchInputEl,
    searchClearBtnEl,
    searchPrevBtnEl,
    searchNextBtnEl,
    searchRoleEl,
    searchFromEl,
    searchToEl,
    runHistorySearch: async ({ resetPage }) => {
      calls.push(resetPage ? "reset" : `page:${state.search.page}`);
    },
    clearSearchResults: () => {
      calls.push("clear");
    },
  });

  searchBtnEl.trigger("click");
  searchPrevBtnEl.trigger("click");
  searchNextBtnEl.trigger("click");
  searchClearBtnEl.trigger("click");
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

  assert.equal(searchInputEl.value, "");
  assert.equal(searchRoleEl.value, "all");
  assert.equal(searchFromEl.value, "");
  assert.equal(searchToEl.value, "");
  assert.equal(state.search.query, "");
  assert.deepEqual(calls, ["reset", "page:1", "page:2", "clear"]);
});

test("bindAdminTelemetryButtons registra handlers de change e click", async () => {
  const telemetryOptInEl = createMockElement();
  const telemetryStatsBtnEl = createMockElement();
  const auditExportBtnEl = createMockElement();
  const configHistoryBtnEl = createMockElement();
  const diagnosticsExportBtnEl = createMockElement();
  const calls = [];

  telemetryOptInEl.checked = true;

  bindAdminTelemetryButtons({
    telemetryOptInEl,
    telemetryStatsBtnEl,
    auditExportBtnEl,
    configHistoryBtnEl,
    diagnosticsExportBtnEl,
    setTelemetryEnabled: async (value) => {
      calls.push(`set:${value}`);
    },
    showTelemetryStats: async () => {
      calls.push("stats");
    },
    exportAuditLogsJson: async () => {
      calls.push("audit");
    },
    openConfigHistoryRollback: async () => {
      calls.push("rollback");
    },
    exportDiagnosticsPackage: async () => {
      calls.push("diag");
    },
    showStatus: () => {},
  });

  telemetryOptInEl.trigger("change");
  telemetryStatsBtnEl.trigger("click");
  auditExportBtnEl.trigger("click");
  configHistoryBtnEl.trigger("click");
  diagnosticsExportBtnEl.trigger("click");
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

  assert.deepEqual(calls, ["set:true", "stats", "audit", "rollback", "diag"]);
});

test("bindHealthStorageButtons usa refreshNow com poller e executa acoes de storage", async () => {
  const state = {
    healthPoller: {
      refreshNow() {
        state._refreshed = true;
      },
    },
    _refreshed: false,
  };

  const healthRefreshBtnEl = createMockElement();
  const storageRefreshBtnEl = createMockElement();
  const storageCleanupBtnEl = createMockElement();
  const storageLimitBtnEl = createMockElement();
  const calls = [];

  bindHealthStorageButtons({
    state,
    healthRefreshBtnEl,
    storageRefreshBtnEl,
    storageCleanupBtnEl,
    storageLimitBtnEl,
    checkOllamaStatus: async () => {
      calls.push("health");
    },
    loadStorageUsage: async () => {
      calls.push("usage");
    },
    runStorageCleanup: async () => {
      calls.push("cleanup");
    },
    updateStorageLimitForCurrentUser: async () => {
      calls.push("limit");
    },
    showStatus: () => {},
  });

  healthRefreshBtnEl.trigger("click");
  storageRefreshBtnEl.trigger("click");
  storageCleanupBtnEl.trigger("click");
  storageLimitBtnEl.trigger("click");
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

  assert.equal(state._refreshed, true);
  assert.deepEqual(calls, ["usage", "cleanup", "limit"]);
});

test("bindStatusRetryButton executa retry action quando existe", async () => {
  const statusRetryBtnEl = createMockElement();
  let retried = 0;

  bindStatusRetryButton({
    statusRetryBtnEl,
    statusPresenter: {
      getRetryAction() {
        return async () => {
          retried += 1;
        };
      },
    },
  });

  statusRetryBtnEl.trigger("click");
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
  assert.equal(retried, 1);
});

test("bindChatListButtons incrementa pagina e atualiza scrollTop", async () => {
  const state = {
    chatList: {
      page: 1,
      totalPages: 3,
      scrollTop: 0,
    },
  };

  const tabsEl = createMockElement();
  tabsEl.scrollTop = 180;
  const chatListLoadMoreBtnEl = createMockElement();
  const calls = [];

  bindChatListButtons({
    state,
    tabsEl,
    chatListLoadMoreBtnEl,
    loadChats: async (options) => {
      calls.push(options);
    },
  });

  chatListLoadMoreBtnEl.trigger("click");
  tabsEl.trigger("scroll");
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

  assert.equal(state.chatList.page, 2);
  assert.equal(state.chatList.scrollTop, 180);
  assert.deepEqual(calls, [{ appendPage: true }]);
});

test("createAppBindingsController bindAll cobre Enter, retry e chat list", async () => {
  const originalDocument = globalThis.document;
  globalThis.document = {
    addEventListener() {},
  };

  const {
    controller,
    state,
    inputEl,
    sendBtnEl,
    statusRetryBtnEl,
    tabsEl,
    chatListLoadMoreBtnEl,
    stats,
  } = createAppBindingsFixture();

  let preventedCount = 0;

  controller.bindAll();
  controller.updateSendButtonState();
  assert.equal(sendBtnEl.disabled, true);

  inputEl.trigger("keydown", {
    key: "Enter",
    shiftKey: false,
    preventDefault() {
      preventedCount += 1;
    },
  });
  assert.equal(stats.sentCount, 1);
  assert.equal(preventedCount, 1);

  inputEl.trigger("keydown", {
    key: "Enter",
    shiftKey: true,
    preventDefault() {
      preventedCount += 1;
    },
  });
  assert.equal(stats.sentCount, 1);
  assert.equal(preventedCount, 1);

  inputEl.value = "mensagem";
  controller.updateSendButtonState();
  assert.equal(sendBtnEl.disabled, false);

  statusRetryBtnEl.trigger("click");
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
  assert.equal(stats.retryCount, 1);

  chatListLoadMoreBtnEl.trigger("click");
  tabsEl.trigger("scroll");
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
  assert.equal(state.chatList.page, 2);
  assert.equal(state.chatList.scrollTop, 240);
  assert.deepEqual(stats.loadChatsCalls, [{ appendPage: true }]);

  globalThis.document = originalDocument;
});

test("buildAppBindingsDeps retorna shape completo e mapeia actions principais", () => {
  const state = { token: "state-ref" };
  const elements = {
    inputEl: createMockElement(),
    sendBtnEl: createMockElement(),
  };

  const shortcutsController = {};
  const onboardingController = {
    openModal() {},
    closeModal() {},
    runChecks() {},
  };
  const voiceController = {
    openHistoryModalWithRender() {},
  };
  const statusPresenter = {};

  const chatNavigationController = {
    createNewChat() {},
    loadChats() {},
  };
  const chatActionsController = {
    renameActiveChat() {},
    toggleFavoriteActiveChat() {},
    toggleArchiveActiveChat() {},
    editTagsActiveChat() {},
    editChatSystemPrompt() {},
    duplicateActiveChat() {},
    deleteActiveChat() {},
  };
  const chatExportController = {
    exportChat() {},
    exportChatJson() {},
    exportAllChatsJson() {},
    exportFavoriteChatsMarkdown() {},
    importChatJson() {},
  };
  const backupController = {
    exportFullBackup() {},
    restoreFullBackup() {},
  };
  const themeLocalController = {
    cycleMode() {},
  };
  const preferencesController = {
    saveThemeForCurrentUser() {},
  };
  const healthStatusController = {
    checkHealth() {},
  };
  const storageController = {
    loadUsage() {},
    runCleanup() {},
    updateLimitForCurrentUser() {},
  };
  const telemetryAdminController = {
    setTelemetryEnabled() {},
    showTelemetryStats() {},
    exportAuditLogsJson() {},
    openConfigHistoryRollback() {},
    exportDiagnosticsPackage() {},
  };
  const historySearchController = {
    runHistorySearch() {},
    clearSearchResults() {},
  };

  function enviar() {}

  const deps = buildAppBindingsDeps({
    state,
    elements,
    shortcutsController,
    onboardingController,
    voiceController,
    statusPresenter,
    closeDuplicateModal() {},
    closeConfirmModal() {},
    closeShortcutsModal() {},
    closeVoiceHistoryModal() {},
    openConfirmModal() {},
    openShortcutsModal() {},
    showStatus() {},
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
  });

  assert.equal(deps.state, state);
  assert.ok(deps.elements);
  assert.ok(deps.controllers);
  assert.ok(deps.modalControls);
  assert.ok(deps.actions);

  assert.equal(deps.actions.enviar, enviar);
  assert.equal(deps.actions.createNewChat, chatNavigationController.createNewChat);
  assert.equal(deps.actions.renameActiveChat, chatActionsController.renameActiveChat);
  assert.equal(deps.actions.exportChat, chatExportController.exportChat);
  assert.equal(deps.actions.exportFullBackup, backupController.exportFullBackup);
  assert.equal(deps.actions.cycleThemeMode, themeLocalController.cycleMode);
  assert.equal(deps.actions.checkOllamaStatus, healthStatusController.checkHealth);
  assert.equal(deps.actions.loadStorageUsage, storageController.loadUsage);
  assert.equal(deps.actions.runHistorySearch, historySearchController.runHistorySearch);
});
