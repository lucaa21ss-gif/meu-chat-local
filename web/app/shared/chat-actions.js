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
    if (!state.activeChatId) return;
    const current = state.chats.find((chat) => chat.id === state.activeChatId);
    const input = window.prompt(
      "Novo nome da aba:",
      current?.title || "Nova conversa",
    );
    if (input === null) return;

    const title = input.trim();
    if (!title) return;

    try {
      await fetchJson(`/api/chats/${encodeURIComponent(state.activeChatId)}`, {
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
    if (!state.activeChatId) return;
    const current = state.chats.find((chat) => chat.id === state.activeChatId);
    const next = !current?.isFavorite;

    try {
      await fetchJson(
        `/api/chats/${encodeURIComponent(state.activeChatId)}/favorite`,
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
    if (!state.activeChatId) return;
    const current = state.chats.find((chat) => chat.id === state.activeChatId);
    const next = !current?.archivedAt;

    try {
      await fetchJson(
        `/api/chats/${encodeURIComponent(state.activeChatId)}/archive`,
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
    if (!state.activeChatId) return;
    const current = state.chats.find((chat) => chat.id === state.activeChatId);
    const currentTags = Array.isArray(current?.tags)
      ? current.tags.join(", ")
      : "";
    const typed = window.prompt(
      "Tags da aba (separadas por virgula):",
      currentTags,
    );
    if (typed === null) return;

    const tags = typed
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 10);

    try {
      await fetchJson(
        `/api/chats/${encodeURIComponent(state.activeChatId)}/tags`,
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
    if (!state.activeChatId) return;

    try {
      const promptData = await fetchJson(
        `/api/chats/${encodeURIComponent(state.activeChatId)}/system-prompt`,
      );
      const current = String(promptData.systemPrompt || "");
      const next = window.prompt(
        "Prompt de sistema desta conversa (vazio para remover):",
        current,
      );
      if (next === null) return;

      await fetchJson(
        `/api/chats/${encodeURIComponent(state.activeChatId)}/system-prompt`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemPrompt: String(next || "") }),
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
    if (!state.activeChatId) return;

    const current = state.chats.find((chat) => chat.id === state.activeChatId);
    const defaultTitle = `${current?.title || "Conversa"} (copia)`;
    const modalResult = await openDuplicateModal(defaultTitle);
    if (!modalResult) return;

    const title = modalResult.title;
    const id = uid();
    const userOnly = modalResult.userOnly;

    try {
      const payload = await fetchJson(
        `/api/chats/${encodeURIComponent(state.activeChatId)}/duplicate`,
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