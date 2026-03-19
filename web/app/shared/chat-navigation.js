import { createFetchHelpers } from "./fetch-helpers.js";

/**
 * Chat navigation controller - handles chat loading, switching, and message loading
 * Factory pattern with dependency injection for testability and loose coupling
 */

export function createChatNavigationController({
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
  const { doFetchWithRetry } = createFetchHelpers(fetchJson, showStatus);

  async function loadChats(options = {}) {
    const { appendPage = false } = options;
    await doFetchWithRetry(
      async () => {
      const previousScrollTop = tabsEl?.scrollTop || 0;
      const query = buildChatsQueryString();
      const data = await fetchJson(`/api/chats?${query}`);
      const incomingChats = data.chats || [];
      const pagination = data.pagination || {};

      state.chatList.total = Number.parseInt(pagination.total, 10) || incomingChats.length;
      state.chatList.totalPages = Number.parseInt(pagination.totalPages, 10) || 0;
      state.chatList.page = Number.parseInt(pagination.page, 10) || state.chatList.page;

      state.chats = appendPage
        ? [...state.chats, ...incomingChats.filter((chat) => !state.chats.some((item) => item.id === chat.id))]
        : incomingChats;
      state.chatList.scrollTop = previousScrollTop;

      if (!state.chats.length) {
        if (
          state.chatFilters.mode !== "archived" &&
          !state.chatFilters.tag &&
          !state.chatList.search
        ) {
          await createNewChat("Conversa Principal");
        } else {
          state.activeChatId = null;
          renderTabs();
          chatEl.innerHTML = "";
        }
          return;
      }

      if (
        !state.activeChatId ||
        !state.chats.some((chat) => chat.id === state.activeChatId)
      ) {
        state.activeChatId = state.chats[0].id;
      }

      renderTabs();
      await loadMessages(state.activeChatId);
      hideStatus();
      },
      "Conversas carregadas com sucesso.",
      "Nao foi possivel carregar as conversas",
    );
  }

  async function loadMessages(chatId) {
    await doFetchWithRetry(
      async () => {
        const data = await fetchJson(
          `/api/chats/${encodeURIComponent(chatId)}/messages`,
        );
        chatEl.innerHTML = "";
        for (const message of data.messages || []) {
          appendMessage(message.role, message.content, { images: message.images });
        }
        hideTyping();
        hideStatus();
      },
      "Mensagens carregadas com sucesso.",
      "Nao foi possivel carregar mensagens",
    );
  }

  async function switchChat(chatId) {
    state.activeChatId = chatId;
    renderTabs();
    await loadMessages(chatId);
    await loadRagDocuments();

    if (state.search.query) {
      await runHistorySearch({ resetPage: true });
    } else {
      clearSearchResults();
    }
  }

  async function createNewChat(title = "Nova conversa") {
    await chatActionsController.createNewChat(title);
  }

  function navigateRelativeTab(step) {
    const totalChats = state.chats.length;
    if (!totalChats) return;

    const currentIndex = state.chats.findIndex(
      (chat) => chat.id === state.activeChatId,
    );
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (baseIndex + step + totalChats) % totalChats;
    const chat = state.chats[nextIndex];
    if (!chat?.id) return;
    switchChat(chat.id).catch(console.error);
  }

  return {
    loadChats,
    loadMessages,
    switchChat,
    createNewChat,
    navigateRelativeTab,
  };
}
