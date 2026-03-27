export function bindCoreInputBindings({
  inputEl,
  duplicateModalEl,
  confirmModalEl,
  shortcutsModalEl,
  voiceHistoryModalEl,
  onboardingModalEl,
  closeDuplicateModal,
  closeConfirmModal,
  closeShortcutsModal,
  closeVoiceHistoryModal,
  onboardingController,
  shortcutsController,
  updateSendButtonState,
  enviar,
}) {
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