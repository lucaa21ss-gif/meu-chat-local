import { createFetchHelpers } from "./fetch-helpers.js";

import { doFetchWithRetry, fetchJsonBody } from "./fetch-helpers.js";

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
    const { doFetchWithRetry, fetchJsonBody } = createFetchHelpers(fetchJson, showStatus);
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
      await doFetchWithRetry(
        async () => {
          await fetchJsonBody("/api/chats", "POST", { id, title, userId: state.userId });
          await onLoadChats();
          await onSwitchChat(id);
        },
        "Nova aba criada com sucesso.",
        "Nao foi possivel criar nova aba",
      );
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

      await doFetchWithRetry(
        async () => {
          await fetchJsonBody(`/api/chats/${encodedChatId}`, "PATCH", { title });
          await onLoadChats();
        },
        "Aba renomeada com sucesso.",
        "Nao foi possivel renomear aba",
      );
  }

  async function toggleFavoriteActiveChat() {
    const current = getActiveChat();
    const encodedChatId = getEncodedActiveChatId();
    if (!encodedChatId) return;
    const next = !current?.isFavorite;

    await doFetchWithRetry(
      async () => {
        await fetchJsonBody(`/api/chats/${encodedChatId}/favorite`, "PATCH", { isFavorite: next });
        await onLoadChats();
      },
      next ? "Aba marcada como favorita." : "Aba removida dos favoritos.",
      "Nao foi possivel atualizar favorito",
    );
  }

  async function toggleArchiveActiveChat() {
    const current = getActiveChat();
    const encodedChatId = getEncodedActiveChatId();
    if (!encodedChatId) return;
    const next = !current?.archivedAt;

    await doFetchWithRetry(
      async () => {
        await fetchJsonBody(`/api/chats/${encodedChatId}/archive`, "PATCH", { archived: next });
        await onLoadChats();
      },
      next ? "Aba arquivada." : "Aba desarquivada.",
      "Nao foi possivel arquivar aba",
    );
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

    await doFetchWithRetry(
      async () => {
        await fetchJsonBody(`/api/chats/${encodedChatId}/tags`, "PATCH", { tags });
        await onLoadChats();
      },
      "Tags atualizadas.",
      "Nao foi possivel atualizar tags",
    );
  }

  async function editChatSystemPrompt() {
    const encodedChatId = getEncodedActiveChatId();
    if (!encodedChatId) return;

    const result = await doFetchWithRetry(
      async () => {
        const promptData = await fetchJson(
          `/api/chats/${encodedChatId}/system-prompt`,
        );
        const current = String(promptData.systemPrompt || "");
        const systemPrompt = promptSystemPrompt(
          "Prompt de sistema desta conversa (vazio para remover):",
          current,
        );
        if (systemPrompt === null) return "cancelled";
        await fetchJsonBody(`/api/chats/${encodedChatId}/system-prompt`, "PATCH", { systemPrompt });
        await onLoadChats();
        return "done";
      },
      null,
      "Falha ao atualizar prompt da conversa",
    );
    if (result === "done") {
      showStatus("Prompt da conversa atualizado.", { type: "success" });
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

    const payload = await doFetchWithRetry(
      async () => {
        const result = await fetchJsonBody(`/api/chats/${encodedChatId}/duplicate`, "POST", { id, title, userOnly });
        await onLoadChats();
        await onSwitchChat(result.chat.id);
        return result;
      },
      "Aba duplicada com sucesso.",
      "Nao foi possivel duplicar aba",
    );
  }

  async function deleteActiveChat() {
    if (!state.activeChatId) return;
    const currentId = state.activeChatId;
    const confirmed = await openConfirmModal(
      "Deseja excluir esta aba e todas as mensagens?",
    );
    if (!confirmed) return;

    await doFetchWithRetry(
      async () => {
        await fetchJson(`/api/chats/${encodeURIComponent(currentId)}`, {
          method: "DELETE",
        });
        await onLoadChats();
      },
      "Aba excluida com sucesso.",
      "Nao foi possivel excluir aba",
    );
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