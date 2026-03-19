import { createButtonBindingHelper } from "./button-binding.js";

export function createAppBindingsController({
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
}) {
  const buttonBinding = createButtonBindingHelper();

  function updateSendButtonState() {
    sendBtnEl.disabled = inputEl.value.trim() === "";
  }

  function bindCoreInputBindings() {
    inputEl.addEventListener("input", updateSendButtonState);
    inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        enviar();
      }
    });
    document.addEventListener("keydown", shortcutsController.handleGlobalShortcuts);

      const modalBackdropHandlers = [
        [duplicateModalEl, (event) => { if (event.target === duplicateModalEl) closeDuplicateModal(null); }],
        [confirmModalEl, (event) => { if (event.target === confirmModalEl) closeConfirmModal(false); }],
        [shortcutsModalEl, (event) => { if (event.target === shortcutsModalEl) closeShortcutsModal(); }],
        [voiceHistoryModalEl, (event) => { if (event.target === voiceHistoryModalEl) closeVoiceHistoryModal(); }],
        [onboardingModalEl, (event) => { onboardingController.handleBackdropClick(event); }],
      ];

      modalBackdropHandlers.forEach(([modal, handler]) => {
        if (modal) modal.addEventListener("click", handler);
      });
  }

  function bindDuplicateModalButtons() {
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
  }

  function bindChatActionButtons() {
    buttonBinding.bindWithErrorHandling(newChatBtnEl, newChatBtnMobileEl, () => createNewChat());
    buttonBinding.bindWithErrorHandling(renameBtnEl, renameBtnMobileEl, () => renameActiveChat());
    buttonBinding.bindWithErrorHandling(favoriteBtnEl, undefined, () => toggleFavoriteActiveChat());
    buttonBinding.bindWithErrorHandling(archiveBtnEl, undefined, () => toggleArchiveActiveChat());
    buttonBinding.bindWithErrorHandling(tagsBtnEl, undefined, () => editTagsActiveChat());
    buttonBinding.bindWithErrorHandling(systemPromptBtnEl, undefined, () => editChatSystemPrompt());
    buttonBinding.bindWithErrorHandling(duplicateBtnEl, duplicateBtnMobileEl, () => duplicateActiveChat());
    buttonBinding.bindWithErrorHandling(deleteBtnEl, deleteBtnMobileEl, () => deleteActiveChat());
  }

  function bindExportButtons() {
    buttonBinding.bindWithErrorHandling(exportBtnEl, exportBtnMobileEl, () => exportChat());
    buttonBinding.bindWithErrorHandling(exportJsonBtnEl, exportJsonBtnMobileEl, () => exportChatJson());
    buttonBinding.bindWithErrorHandling(exportAllJsonBtnEl, exportAllJsonBtnMobileEl, () => exportAllChatsJson());
    buttonBinding.bindWithErrorHandling(exportFavoritesMdBtnEl, exportFavoritesMdBtnMobileEl, () => exportFavoriteChatsMarkdown());
    buttonBinding.bindWithErrorHandling(importJsonBtnEl, importJsonBtnMobileEl, () => importChatJson());
  }

  function bindBackupButtons() {
    buttonBinding.bindWithErrorHandling(backupBtnEl, backupBtnMobileEl, () => exportFullBackup());
    buttonBinding.bindWithErrorHandling(restoreBackupBtnEl, restoreBackupBtnMobileEl, () => restoreFullBackup());
  }

  function bindVoiceHistoryButtons() {
    const voiceButtonHandlers = [
      [voiceHistoryBtnEl, openVoiceHistoryModalWithRender],
      [voiceHistoryCloseBtnEl, closeVoiceHistoryModal],
      [clearVoiceHistoryBtnEl, async () => {
        const confirmed = await openConfirmModal("Deseja limpar todo o historico de voz?");
        if (confirmed) voiceController.clearHistory();
      }],
    ];
    voiceButtonHandlers.forEach(([btn, handler]) => {
      if (btn) btn.addEventListener("click", handler);
    });
  }

  function bindConfirmModalButtons() {
    const confirmButtonHandlers = [
      [confirmCancelBtnEl, () => closeConfirmModal(false)],
      [confirmOkBtnEl, () => closeConfirmModal(true)],
    ];
    confirmButtonHandlers.forEach(([btn, handler]) => {
      if (btn) btn.addEventListener("click", handler);
    });
  }

  function bindThemeButton() {
    if (!darkModeBtnEl) return;

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

  function bindOnboardingButtons() {
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
        onboardingController.complete();
      });
    }
  }

  function bindShortcutsModalButtons() {
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
  }

  function bindStatusRetryButton() {
    if (!statusRetryBtnEl) return;

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

  function bindSearchButtons() {
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
        if (state.search.totalPages === 0 || state.search.page >= state.search.totalPages) return;
        state.search.page += 1;
        runHistorySearch({ resetPage: false }).catch((error) => {
          console.error(error);
        });
      });
    }
  }

  function bindChatListButtons() {
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
  }

  function bindAdminTelemetryButtons() {
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
  }

  function bindHealthStorageButtons() {
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
  }

  function bindAll() {
    shortcutsController.renderShortcutsHelp();
    bindCoreInputBindings();
    bindDuplicateModalButtons();
    bindChatActionButtons();
    bindExportButtons();
    bindBackupButtons();
    bindVoiceHistoryButtons();
    bindConfirmModalButtons();
    bindThemeButton();
    bindOnboardingButtons();
    bindShortcutsModalButtons();
    bindStatusRetryButton();
    bindSearchButtons();
    bindChatListButtons();
    bindAdminTelemetryButtons();
    bindHealthStorageButtons();
  }

  return {
    bindAll,
    updateSendButtonState,
  };
}