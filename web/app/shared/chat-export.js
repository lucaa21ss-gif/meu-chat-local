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

export function createChatExportController({
  state,
  apiBase,
  fetchJson,
  showStatus,
  onLoadChats,
  onLoadMessages,
}) {
  async function exportChat() {
    if (!state.activeChatId) return;

    try {
      const response = await fetch(
        `${apiBase}/api/chats/${encodeURIComponent(state.activeChatId)}/export?format=markdown`,
      );
      if (!response.ok) {
        throw new Error("Falha ao exportar conversa");
      }

      const markdown = await response.text();
      downloadTextFile(markdown, "text/markdown", `${state.activeChatId}.md`);
      showStatus("Conversa exportada com sucesso.", { type: "success" });
    } catch (error) {
      showStatus(`Nao foi possivel exportar conversa: ${error.message}`, {
        type: "error",
        retryAction: () => exportChat(),
      });
      throw error;
    }
  }

  async function exportFavoriteChatsMarkdown() {
    try {
      const response = await fetch(
        `${apiBase}/api/chats/export?userId=${encodeURIComponent(state.userId)}&favorites=true&format=markdown`,
      );
      if (!response.ok) {
        throw new Error("Falha ao exportar favoritos em Markdown");
      }

      const markdownText = await response.text();
      downloadTextFile(
        markdownText,
        "text/markdown",
        `chats-favoritos-${state.userId}.md`,
      );
      showStatus("Favoritos exportados em Markdown com sucesso.", {
        type: "success",
      });
    } catch (error) {
      showStatus(
        `Nao foi possivel exportar favoritos em Markdown: ${error.message}`,
        {
          type: "error",
          retryAction: () => exportFavoriteChatsMarkdown(),
        },
      );
      throw error;
    }
  }

  async function exportChatJson() {
    if (!state.activeChatId) return;

    try {
      const response = await fetch(
        `${apiBase}/api/chats/${encodeURIComponent(state.activeChatId)}/export?format=json`,
      );
      if (!response.ok) {
        throw new Error("Falha ao exportar conversa em JSON");
      }

      const jsonText = await response.text();
      downloadTextFile(
        jsonText,
        "application/json",
        `${state.activeChatId}.json`,
      );
      showStatus("Conversa exportada em JSON com sucesso.", { type: "success" });
    } catch (error) {
      showStatus(`Nao foi possivel exportar JSON: ${error.message}`, {
        type: "error",
        retryAction: () => exportChatJson(),
      });
      throw error;
    }
  }

  async function importChatJson() {
    try {
      const file = await pickJsonFile();
      if (!file) return;

      const raw = await file.text();
      const payload = JSON.parse(raw);

      const imported = await fetchJson("/api/chats/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await onLoadChats();
      if (imported?.chat?.id) {
        state.activeChatId = imported.chat.id;
        await onLoadMessages();
      }

      showStatus("Conversa importada com sucesso.", { type: "success" });
    } catch (error) {
      showStatus(`Nao foi possivel importar JSON: ${error.message}`, {
        type: "error",
        retryAction: () => importChatJson(),
      });
      throw error;
    }
  }

  async function exportAllChatsJson() {
    try {
      const response = await fetch(
        `${apiBase}/api/chats/export?userId=${encodeURIComponent(state.userId)}`,
      );
      if (!response.ok) {
        throw new Error("Falha ao exportar lote de conversas");
      }

      const jsonText = await response.text();
      downloadTextFile(
        jsonText,
        "application/json",
        `chats-${state.userId}.json`,
      );
      showStatus("Conversas exportadas em lote com sucesso.", {
        type: "success",
      });
    } catch (error) {
      showStatus(`Nao foi possivel exportar lote: ${error.message}`, {
        type: "error",
        retryAction: () => exportAllChatsJson(),
      });
      throw error;
    }
  }

  return {
    exportChat,
    exportFavoriteChatsMarkdown,
    exportChatJson,
    importChatJson,
    exportAllChatsJson,
  };
}