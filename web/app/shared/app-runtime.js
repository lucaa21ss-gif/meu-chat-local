export function createAppRuntimeController({
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
  function getCurrentUser() {
    return (state.users || []).find((user) => user.id === state.userId) || null;
  }

  function smoothScrollToBottom() {
    chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: "smooth" });
  }

  function uid() {
    return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function bootstrap() {
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
  }

  return {
    bootstrap,
    getCurrentUser,
    smoothScrollToBottom,
    uid,
  };
}