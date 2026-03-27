import { createFetchHelpers } from "../shared/fetch-helpers.js";

function downloadTextFile(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function pickJsonFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener(
      "change",
      () => resolve(input.files?.[0] || null),
      { once: true },
    );
    input.click();
  });
}

async function exportTextFromEndpoint({
  url,
  contentType,
  filename,
  requestErrorMessage,
  successMessage,
  errorMessagePrefix,
  showStatus,
  retryAction,
}) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(requestErrorMessage);
    }

    const text = await response.text();
    downloadTextFile(text, contentType, filename);
    showStatus(successMessage, { type: "success" });
  } catch (error) {
    showStatus(`${errorMessagePrefix}: ${error.message}`, {
      type: "error",
      retryAction,
    });
    throw error;
  }
}

/**
 * ChatExportController — exporta/importa conversas em MD, JSON e lote.
 *
 * @param {Object} deps
 * @param {import("../../bootstrap.js").AppState} deps.state
 * @param {string}   deps.apiBase       — URL base da API
 * @param {Function} deps.fetchJson     — client HTTP
 * @param {(msg: string, opts?: object) => void} deps.showStatus
 * @param {() => Promise<void>} deps.onLoadChats
 * @param {() => Promise<void>} deps.onLoadMessages
 * @returns {{ exportChat: Function, exportFavoriteChatsMarkdown: Function, exportChatJson: Function, importChatJson: Function, exportAllChatsJson: Function }}
 */
export function createChatExportController({
  state,
  apiBase,
  fetchJson,
  showStatus,
  onLoadChats,
  onLoadMessages,
}) {
  const { doFetchWithRetry, fetchJsonBody } = createFetchHelpers(fetchJson, showStatus);

  async function exportChat() {
    if (!state.activeChatId) return;

    await exportTextFromEndpoint({
      url: `${apiBase}/api/chats/${encodeURIComponent(state.activeChatId)}/export?format=markdown`,
      contentType: "text/markdown",
      filename: `${state.activeChatId}.md`,
      requestErrorMessage: "Falha ao exportar conversa",
      successMessage: "Conversa exportada com sucesso.",
      errorMessagePrefix: "Nao foi possivel exportar conversa",
      showStatus,
      retryAction: () => exportChat(),
    });
  }

  async function exportFavoriteChatsMarkdown() {
    await exportTextFromEndpoint({
      url: `${apiBase}/api/chats/export?userId=${encodeURIComponent(state.userId)}&favorites=true&format=markdown`,
      contentType: "text/markdown",
      filename: `chats-favoritos-${state.userId}.md`,
      requestErrorMessage: "Falha ao exportar favoritos em Markdown",
      successMessage: "Favoritos exportados em Markdown com sucesso.",
      errorMessagePrefix: "Nao foi possivel exportar favoritos em Markdown",
      showStatus,
      retryAction: () => exportFavoriteChatsMarkdown(),
    });
  }

  async function exportChatJson() {
    if (!state.activeChatId) return;

    await exportTextFromEndpoint({
      url: `${apiBase}/api/chats/${encodeURIComponent(state.activeChatId)}/export?format=json`,
      contentType: "application/json",
      filename: `${state.activeChatId}.json`,
      requestErrorMessage: "Falha ao exportar conversa em JSON",
      successMessage: "Conversa exportada em JSON com sucesso.",
      errorMessagePrefix: "Nao foi possivel exportar JSON",
      showStatus,
      retryAction: () => exportChatJson(),
    });
  }

  async function importChatJson() {
    const file = await pickJsonFile();
    if (!file) return;

    await doFetchWithRetry(
      async () => {
        const raw = await file.text();
        const payload = JSON.parse(raw);

        const imported = await fetchJsonBody("/api/chats/import", "POST", payload);

        await onLoadChats();
        if (imported?.chat?.id) {
          state.activeChatId = imported.chat.id;
          await onLoadMessages();
        }
      },
      "Conversa importada com sucesso.",
      "Nao foi possivel importar JSON",
    );
  }

  async function exportAllChatsJson() {
    await exportTextFromEndpoint({
      url: `${apiBase}/api/chats/export?userId=${encodeURIComponent(state.userId)}`,
      contentType: "application/json",
      filename: `chats-${state.userId}.json`,
      requestErrorMessage: "Falha ao exportar lote de conversas",
      successMessage: "Conversas exportadas em lote com sucesso.",
      errorMessagePrefix: "Nao foi possivel exportar lote",
      showStatus,
      retryAction: () => exportAllChatsJson(),
    });
  }

  return {
    exportChat,
    exportFavoriteChatsMarkdown,
    exportChatJson,
    importChatJson,
    exportAllChatsJson,
  };
}