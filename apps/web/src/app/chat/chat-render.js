/**
 * ChatRenderController — gerencia a área de mensagens e as abas de conversa.
 *
 * Responsabilidades DESTA camada:
 *   - Inserir/remover bolhas no DOM via createChatBubble()
 *   - Renderizar lista de abas (tabs desktop + mobile)
 *   - Controlar visibilidade do indicador de digitação
 *   - Sincronizar labels dos botões favoritar/arquivar
 *
 * NÃO é responsabilidade desta camada:
 *   - Criação do HTML interno das bolhas → chat-bubble.js
 *   - Busca de dados → chat-navigation.js
 *   - Envio de mensagens → chat-send.js
 *
 * @module app/chat/render
 */

import { createChatBubble, createAvatar } from "../../ui/components/chat-bubble.js";

export function createChatRenderController({
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
  /* ─── Helpers de visibilidade ─────────────────────────────── */
  function showElement(el) {
    el?.classList.remove("hidden");
    el?.classList.add("flex");
  }
  function hideElement(el) {
    el?.classList.add("hidden");
    el?.classList.remove("flex");
  }

  /* ─── Indicador de digitação ──────────────────────────────── */
  function showTyping() { showElement(typingEl); }
  function hideTyping() { hideElement(typingEl); }

  /**
   * Adiciona uma mensagem ao histórico visual.
   * Delega criação do DOM ao componente `chat-bubble`.
   *
   * @param {"user"|"assistant"} role
   * @param {string} content
   * @param {{ images?: string[], sources?: object[] }} [options]
   * @returns {HTMLDivElement} contentEl — nó de texto para atualização em streaming
   */
  function appendMessage(role, content, options = {}) {
    const { wrapper, contentEl } = createChatBubble(role, content, options);
    chatEl.appendChild(wrapper);
    smoothScrollToBottom();
    return contentEl;
  }

  /* ─── Renderização das abas ───────────────────────────────── */
  function renderTabs() {
    tabsEl.innerHTML = "";
    if (tabsMobileEl) tabsMobileEl.innerHTML = "";

    state.chats.forEach((chat) => {
      /* ── Tab Desktop ─── */
      const btn = document.createElement("button");
      btn.type      = "button";
      btn.className = chat.id === state.activeChatId
        ? "ai-chat-tab active w-full text-left"
        : "ai-chat-tab w-full text-left";

      const markers = [];
      if (chat.isFavorite)                                     markers.push("★");
      if (chat.archivedAt)                                     markers.push("📦");
      if (Array.isArray(chat.tags) && chat.tags.length > 0)   markers.push(`#${chat.tags[0]}`);

      btn.textContent = `${markers.join(" ")} ${chat.title || "Nova conversa"}`.trim();
      btn.addEventListener("click", () => switchChat(chat.id));
      tabsEl.appendChild(btn);

      /* ── Tab Mobile ─── */
      if (tabsMobileEl) {
        const compact = document.createElement("button");
        compact.type      = "button";
        compact.className = chat.id === state.activeChatId
          ? "ai-chat-tab active shrink-0 rounded-full px-3 py-1 text-xs whitespace-nowrap"
          : "ai-chat-tab shrink-0 rounded-full px-3 py-1 text-xs whitespace-nowrap";

        compact.textContent = chat.isFavorite
          ? `★ ${chat.title || "Nova"}`
          : chat.title || "Nova";
        compact.addEventListener("click", () => switchChat(chat.id));
        tabsMobileEl.appendChild(compact);
      }
    });

    /* ── Labels dos botões favoritar / arquivar ─── */
    const activeChat = state.chats.find((c) => c.id === state.activeChatId);
    if (favoriteBtnEl)
      favoriteBtnEl.textContent = activeChat?.isFavorite ? "Desfavoritar aba" : "Favoritar aba";
    if (archiveBtnEl)
      archiveBtnEl.textContent  = activeChat?.archivedAt  ? "Desarquivar aba" : "Arquivar aba";

    updateChatListPaginationUi();

    /* Restaura scroll da lista de abas */
    requestAnimationFrame(() => {
      if (tabsEl) tabsEl.scrollTop = state.chatList.scrollTop;
    });
  }

  return { showTyping, hideTyping, createAvatar, appendMessage, renderTabs };
}
