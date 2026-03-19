export function createChatListController(options = {}) {
  const ELEMENT_NAMES = ["chatListPaginationInfo", "chatListLoadMoreBtn"];
  const elements = Object.fromEntries(
    ELEMENT_NAMES.map(name => [name + "El", options[name + "El"] || null])
  );
  const { chatListPaginationInfoEl, chatListLoadMoreBtnEl } = elements;

  const state = options.state;
  const onScheduledSearch = options.onScheduledSearch || null;

  function buildQueryString() {
    const params = new URLSearchParams();
    params.set("userId", state.userId);
    params.set("page", String(state.chatList.page));
    params.set("limit", String(state.chatList.limit));

    if (state.chatFilters.mode === "favorites") {
      params.set("favorite", "true");
    }
    if (state.chatFilters.mode === "archived") {
      params.set("archived", "true");
    }
    if (state.chatFilters.tag) {
      params.set("tag", state.chatFilters.tag);
    }
    if (state.chatList.search) {
      params.set("search", state.chatList.search);
    }

    return params.toString();
  }

  function updatePaginationUi() {
    if (chatListPaginationInfoEl) {
      const total = state.chatList.total;
      const loaded = state.chats.length;
      if (state.chatList.search) {
        chatListPaginationInfoEl.textContent = `Busca ativa: ${total} conversa(s), ${loaded} carregada(s).`;
      } else {
        chatListPaginationInfoEl.textContent = `Conversas carregadas: ${loaded} de ${total}.`;
      }
    }

    if (!chatListLoadMoreBtnEl) return;
    const hasMore = state.chatList.page < state.chatList.totalPages;
    chatListLoadMoreBtnEl.classList.toggle("hidden", !hasMore);
    chatListLoadMoreBtnEl.disabled = !hasMore;
  }

  function resetPagination(resetOptions = {}) {
    state.chatList.page = 1;
    if (resetOptions.keepScroll !== true) {
      state.chatList.scrollTop = 0;
    }
  }

  function scheduleSearch() {
    if (state.chatList.searchTimer) {
      window.clearTimeout(state.chatList.searchTimer);
    }

    state.chatList.searchTimer = window.setTimeout(() => {
      state.chatList.searchTimer = null;
      resetPagination();
      if (typeof onScheduledSearch === "function") {
        onScheduledSearch();
      }
    }, 300);
  }

  return {
    buildQueryString,
    updatePaginationUi,
    resetPagination,
    scheduleSearch,
  };
}
