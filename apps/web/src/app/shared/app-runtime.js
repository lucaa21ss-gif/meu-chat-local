import { createLocalStorage } from "../../infra/local-storage.js";

/**
 * AppRuntimeController — bootstrap, helpers globais (uid, scroll, user lookup).
 *
 * @param {Object} deps
 * @param {import("../../bootstrap.js").AppState} deps.state
 * @param {HTMLElement} deps.chatEl
 * @param {Function} deps.createHealthPoller
 * @param {Function} deps.checkOllamaStatus
 * @param {Function} deps.loadDarkMode
 * @param {Function} deps.applyPreferredModel
 * @param {Function} deps.loadVoiceHistory
 * @param {Function} deps.setupVoiceInput
 * @param {Function} deps.setupDragAndDrop
 * @param {Function} deps.updateSendButtonState
 * @param {Function} deps.updateFilterUi
 * @param {Function} deps.renderStorageUsage
 * @param {Function} deps.loadTelemetryState
 * @param {Function} deps.loadUsers
 * @param {Function} deps.loadChats
 * @param {Function} deps.loadRagDocuments
 * @param {Function} deps.openOnboardingModal
 * @returns {{ bootstrap, getCurrentUser, smoothScrollToBottom, uid }}
 */
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
  const storage = createLocalStorage();

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

    if (storage.getRaw("onboardingDone") !== "true") {
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