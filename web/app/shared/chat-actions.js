export function createChatActionsController({
  state,
  fetchJson,
  showStatus,
  openConfirmModal,
  openDuplicateModal,
  uid,
  onLoadChats,
  onSwitchChat,
}) {
  function getActiveChat() {
    if (!state.activeChatId) return null;
    return state.chats.find((chat) => chat.id === state.activeChatId) || null;
  }

  function getEncodedActiveChatId() {
    if (!state.activeChatId) return null;
    return encodeURIComponent(state.activeChatId);
  }

  function promptAndTrim(message, defaultValue = "") {
    const input = window.prompt(message, defaultValue);
    if (input === null) return null;
    const trimmed = input.trim();
    return trimmed || null;
  }

  function promptTags(message, currentTags = "") {
    const typed = window.prompt(message, currentTags);
    if (typed === null) return null;
    return typed
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  function promptSystemPrompt(message, defaultValue = "") {
    const input = window.prompt(message, defaultValue);
    if (input === null) return null;
    return String(input || "");
  }

  async function createNewChat(title = "Nova conversa") {
    const id = uid();
    try {
      await fetchJson("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title, userId: state.userId }),
      });

      await onLoadChats();
      await onSwitchChat(id);
      showStatus("Nova aba criada com sucesso.", { type: "success" });
    } catch (error) {
      showStatus(`Nao foi possivel criar nova aba: ${error.message}`, {
        type: "error",
        retryAction: () => createNewChat(title),
      });
      throw error;
    }
  }

  async function renameActiveChat() {
    const current = getActiveChat();
    const encodedChatId = getEncodedActiveChatId();
    if (!encodedChatId) return;

    const title = promptAndTrim(
      "Novo nome da aba:",
      current?.title || "Nova conversa",
    );
    if (title === null) return;

    try {
      await fetchJson(`/api/chats/${encodedChatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      await onLoadChats();
      showStatus("Aba renomeada com sucesso.", { type: "success" });
    } catch (error) {
      showStatus(`Nao foi possivel renomear aba: ${error.message}`, {
        type: "error",
        retryAction: () => renameActiveChat(),
      });
      throw error;
    }
  }

  async function toggleFavoriteActiveChat() {
    const current = getActiveChat();
    const encodedChatId = getEncodedActiveChatId();
    if (!encodedChatId) return;
    const next = !current?.isFavorite;

    try {
      await fetchJson(
        `/api/chats/${encodedChatId}/favorite`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isFavorite: next }),
        },
      );
      await onLoadChats();
      showStatus(
        next ? "Aba marcada como favorita." : "Aba removida dos favoritos.",
        {
          type: "success",
          autoHideMs: 2500,
        },
      );
    } catch (error) {
      showStatus(`Nao foi possivel atualizar favorito: ${error.message}`, {
        type: "error",
      });
    }
  }

  async function toggleArchiveActiveChat() {
    const current = getActiveChat();
    const encodedChatId = getEncodedActiveChatId();
    if (!encodedChatId) return;
    const next = !current?.archivedAt;

    try {
      await fetchJson(
        `/api/chats/${encodedChatId}/archive`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: next }),
        },
      );
      await onLoadChats();
      showStatus(next ? "Aba arquivada." : "Aba desarquivada.", {
        type: "success",
        autoHideMs: 2500,
      });
    } catch (error) {
      showStatus(`Nao foi possivel arquivar aba: ${error.message}`, {
        type: "error",
      });
    }
  }

  async function editTagsActiveChat() {
    const current = getActiveChat();
    const encodedChatId = getEncodedActiveChatId();
    if (!encodedChatId) return;

    const currentTags = Array.isArray(current?.tags)
      ? current.tags.join(", ")
      : "";
    const tags = promptTags(
      "Tags da aba (separadas por virgula):",
      currentTags,
    );
    if (tags === null) return;

    try {
      await fetchJson(
        `/api/chats/${encodedChatId}/tags`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags }),
        },
      );
      await onLoadChats();
      showStatus("Tags atualizadas.", { type: "success", autoHideMs: 2500 });
    } catch (error) {
      showStatus(`Nao foi possivel atualizar tags: ${error.message}`, {
        type: "error",
      });
    }
  }

  async function editChatSystemPrompt() {
    const encodedChatId = getEncodedActiveChatId();
    if (!encodedChatId) return;

    try {
      const promptData = await fetchJson(
        `/api/chats/${encodedChatId}/system-prompt`,
      );
      const current = String(promptData.systemPrompt || "");
      const systemPrompt = promptSystemPrompt(
        "Prompt de sistema desta conversa (vazio para remover):",
        current,
      );
      if (systemPrompt === null) return;

      await fetchJson(
        `/api/chats/${encodedChatId}/system-prompt`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemPrompt }),
        },
      );

      await onLoadChats();
      showStatus("Prompt da conversa atualizado.", { type: "success" });
    } catch (error) {
      showStatus(`Falha ao atualizar prompt da conversa: ${error.message}`, {
        type: "error",
      });
    }
  }

  async function duplicateActiveChat() {
    const current = getActiveChat();
    const encodedChatId = getEncodedActiveChatId();
    if (!encodedChatId) return;

    const defaultTitle = `${current?.title || "Conversa"} (copia)`;
    const modalResult = await openDuplicateModal(defaultTitle);
    if (!modalResult) return;

    const title = modalResult.title;
    const id = uid();
    const userOnly = modalResult.userOnly;

    try {
      const payload = await fetchJson(
        `/api/chats/${encodedChatId}/duplicate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, title, userOnly }),
        },
      );

      await onLoadChats();
      await onSwitchChat(payload.chat.id);
      showStatus("Aba duplicada com sucesso.", { type: "success" });
    } catch (error) {
      showStatus(`Nao foi possivel duplicar aba: ${error.message}`, {
        type: "error",
        retryAction: () => duplicateActiveChat(),
      });
      throw error;
    }
  }

  async function deleteActiveChat() {
    if (!state.activeChatId) return;
    const currentId = state.activeChatId;
    const confirmed = await openConfirmModal(
      "Deseja excluir esta aba e todas as mensagens?",
    );
    if (!confirmed) return;

    try {
      await fetchJson(`/api/chats/${encodeURIComponent(currentId)}`, {
        method: "DELETE",
      });

      await onLoadChats();
      showStatus("Aba excluida com sucesso.", { type: "success" });
    } catch (error) {
      showStatus(`Nao foi possivel excluir aba: ${error.message}`, {
        type: "error",
        retryAction: () => deleteActiveChat(),
      });
      throw error;
    }
  }

  return {
    createNewChat,
    renameActiveChat,
    toggleFavoriteActiveChat,
    toggleArchiveActiveChat,
    editTagsActiveChat,
    editChatSystemPrompt,
    duplicateActiveChat,
    deleteActiveChat,
  };
}