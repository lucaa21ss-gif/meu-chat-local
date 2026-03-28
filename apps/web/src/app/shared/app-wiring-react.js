import {
  buildChatActionsDeps,
  buildChatNavigationDeps,
  buildPreferencesDeps,
  buildStatusPresenterDeps,
} from "./app-wiring.js";

/**
 * Contrato do adapter React para unificacao sem mexer no legado.
 *
 * @param {Object} params
 * @param {{ current: Object }} params.stateRef
 * @param {(action: Object) => void} params.dispatch
 * @param {Object} params.fetchers
 * @param {Function} params.fetchers.fetchJson
 * @param {Object} params.elements
 * @param {HTMLElement|null} params.elements.statusBarEl
 * @param {HTMLElement|null} params.elements.statusTextEl
 * @param {HTMLElement|null} params.elements.statusRetryBtnEl
 * @param {HTMLElement|null} params.elements.chatEl
 * @param {HTMLElement|null} params.elements.tabsEl
 * @param {Object} params.callbacks
 * @param {Function} params.callbacks.buildChatsQueryString
 * @param {Function} params.callbacks.renderTabs
 * @param {Function} params.callbacks.appendMessage
 * @param {Function} params.callbacks.hideTyping
 * @param {Function} params.callbacks.hideStatus
 * @param {Function} params.callbacks.showStatus
 * @param {Function} params.callbacks.loadRagDocuments
 * @param {Function} params.callbacks.runHistorySearch
 * @param {Function} params.callbacks.clearSearchResults
 * @param {Function} params.callbacks.getCurrentUser
 * @param {Function} params.callbacks.getMainModelSelect
 * @param {Function} params.callbacks.applyThemeMode
 * @param {Function} params.callbacks.openConfirmModal
 * @param {Function} params.callbacks.openDuplicateModal
 * @param {Function} params.callbacks.uid
 * @param {Function} params.callbacks.onLoadChats
 * @param {Function} params.callbacks.onSwitchChat
 * @returns {{
 *   statusPresenterDeps: Object,
 *   preferencesDeps: Object,
 *   chatActionsDeps: Object,
 *   chatNavigationDeps: Object,
 *   reactUi: { dispatchStatus: Function, setActiveChat: Function }
 * }}
 */
export function createReactAppWiringContract({
  stateRef,
  dispatch,
  fetchers,
  elements,
  callbacks,
}) {
  const state = stateRef?.current || {};

  const statusPresenterDeps = buildStatusPresenterDeps({
    statusBarEl: elements?.statusBarEl || null,
    statusTextEl: elements?.statusTextEl || null,
    statusRetryBtnEl: elements?.statusRetryBtnEl || null,
  });

  const preferencesDeps = buildPreferencesDeps({
    state,
    fetchJson: fetchers.fetchJson,
    getCurrentUser: callbacks.getCurrentUser,
    getMainModelSelect: callbacks.getMainModelSelect,
    applyThemeMode: callbacks.applyThemeMode,
  });

  const chatActionsDeps = buildChatActionsDeps({
    state,
    fetchJson: fetchers.fetchJson,
    showStatus: callbacks.showStatus,
    openConfirmModal: callbacks.openConfirmModal,
    openDuplicateModal: callbacks.openDuplicateModal,
    uid: callbacks.uid,
    onLoadChats: callbacks.onLoadChats,
    onSwitchChat: callbacks.onSwitchChat,
  });

  const chatNavigationDeps = buildChatNavigationDeps({
    state,
    chatEl: elements?.chatEl || null,
    tabsEl: elements?.tabsEl || null,
    fetchJson: fetchers.fetchJson,
    buildChatsQueryString: callbacks.buildChatsQueryString,
    renderTabs: callbacks.renderTabs,
    appendMessage: callbacks.appendMessage,
    hideTyping: callbacks.hideTyping,
    hideStatus: callbacks.hideStatus,
    showStatus: callbacks.showStatus,
    loadRagDocuments: callbacks.loadRagDocuments,
    runHistorySearch: callbacks.runHistorySearch,
    clearSearchResults: callbacks.clearSearchResults,
    chatActionsController: null,
  });

  return {
    statusPresenterDeps,
    preferencesDeps,
    chatActionsDeps,
    chatNavigationDeps,
    reactUi: {
      dispatchStatus(message, level = "info") {
        dispatch({ type: "ui/status", payload: { message, level } });
      },
      setActiveChat(chatId) {
        dispatch({ type: "chat/setActive", payload: { chatId } });
      },
    },
  };
}
