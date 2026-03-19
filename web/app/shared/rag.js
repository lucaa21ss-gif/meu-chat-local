import { createFetchHelpers } from "./fetch-helpers.js";

export function createRagController({
  state,
  ragStatusEl,
  docInputEl,
  fetchJson,
  filesToDocuments,
  showStatus,
  getActiveChatId,
}) {
  const { doFetchWithRetry, fetchJsonBody } = createFetchHelpers(fetchJson, showStatus);

  function renderStatus() {
    if (!ragStatusEl) return;

    if (!getActiveChatId()) {
      ragStatusEl.textContent = "Selecione uma aba para usar documentos locais.";
      return;
    }

    if (state.rag.docCount > 0) {
      ragStatusEl.textContent = `${state.rag.docCount} documento(s) indexado(s) nesta aba.`;
    } else {
      ragStatusEl.textContent = "Base documental vazia para esta aba.";
    }
  }

  async function loadDocuments() {
    const activeChatId = getActiveChatId();
    if (!activeChatId) {
      state.rag.docCount = 0;
      renderStatus();
      return;
    }

    await doFetchWithRetry(
      async () => {
        const data = await fetchJson(
          `/api/chats/${encodeURIComponent(activeChatId)}/rag/documents`,
        );
        state.rag.docCount = Array.isArray(data.documents)
          ? data.documents.length
          : 0;
        renderStatus();
      },
      "Base documental carregada com sucesso.",
      "Falha ao carregar base documental",
    ).catch((e) => {
      state.rag.docCount = 0;
      renderStatus();
      throw e;
    });
  }

  async function uploadDocuments() {
    const activeChatId = getActiveChatId();
    if (!activeChatId) {
      showStatus("Selecione uma aba para enviar documentos.", { type: "error" });
      return;
    }

    const files = Array.from(docInputEl?.files || []);
    if (!files.length) {
      showStatus("Selecione ao menos um arquivo de texto para indexar.", {
        type: "info",
        autoHideMs: 2500,
      });
      return;
    }

    await doFetchWithRetry(
      async () => {
        const documents = await filesToDocuments(files);
        if (!documents.length) {
          throw new Error(
            "Nenhum arquivo com conteudo textual valido foi encontrado",
          );
        }

        const payload = await fetchJsonBody(
          `/api/chats/${encodeURIComponent(activeChatId)}/rag/documents`,
          "POST",
          { documents },
        );
        state.rag.docCount = Array.isArray(payload.documents)
          ? payload.documents.length
          : state.rag.docCount;
        renderStatus();
        if (docInputEl) docInputEl.value = "";
      },
      "Documentos indexados com sucesso.",
      "Falha ao indexar documentos",
    );
  }

  return {
    renderStatus,
    loadDocuments,
    uploadDocuments,
  };
}
