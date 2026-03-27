export function bindDuplicateModalButtons({
  duplicateCancelBtnEl,
  duplicateConfirmBtnEl,
  duplicateTitleInputEl,
  duplicateModeUserEl,
  closeDuplicateModal,
}) {
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

export function bindVoiceHistoryButtons({
  voiceHistoryBtnEl,
  voiceHistoryCloseBtnEl,
  clearVoiceHistoryBtnEl,
  openVoiceHistoryModalWithRender,
  closeVoiceHistoryModal,
  openConfirmModal,
  voiceController,
}) {
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

export function bindConfirmModalButtons({
  confirmCancelBtnEl,
  confirmOkBtnEl,
  closeConfirmModal,
}) {
  const confirmButtonHandlers = [
    [confirmCancelBtnEl, () => closeConfirmModal(false)],
    [confirmOkBtnEl, () => closeConfirmModal(true)],
  ];
  confirmButtonHandlers.forEach(([btn, handler]) => {
    if (btn) btn.addEventListener("click", handler);
  });
}

export function bindOnboardingButtons({
  onboardingBtnEl,
  onboardingRunChecksBtnEl,
  onboardingSkipBtnEl,
  onboardingCompleteBtnEl,
  openOnboardingModal,
  runOnboardingChecks,
  closeOnboardingModal,
  onboardingController,
  showStatus,
}) {
  const onboardingButtonHandlers = [
    [onboardingBtnEl, () => openOnboardingModal()],
    [onboardingRunChecksBtnEl, () => {
      runOnboardingChecks().catch((error) => {
        showStatus(`Falha no onboarding: ${error.message}`, { type: "error" });
        console.error(error);
      });
    }],
    [onboardingSkipBtnEl, () => closeOnboardingModal()],
    [onboardingCompleteBtnEl, () => onboardingController.complete()],
  ];

  onboardingButtonHandlers.forEach(([btn, handler]) => {
    if (btn) btn.addEventListener("click", handler);
  });
}

export function bindShortcutsModalButtons({
  shortcutsHelpBtnEl,
  shortcutsCloseBtnEl,
  openShortcutsModal,
  closeShortcutsModal,
}) {
  const shortcutsButtonHandlers = [
    [shortcutsHelpBtnEl, () => openShortcutsModal()],
    [shortcutsCloseBtnEl, () => closeShortcutsModal()],
  ];

  shortcutsButtonHandlers.forEach(([btn, handler]) => {
    if (btn) btn.addEventListener("click", handler);
  });
}