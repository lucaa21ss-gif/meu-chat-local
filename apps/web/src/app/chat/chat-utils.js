import { createFetchHelpers } from "../shared/fetch-helpers.js";

/**
 * ChatUtilsController — controles de interface (temperatura/modelo/contexto),
 * prompt padrão do perfil, reset de conversa e drag-and-drop de imagens.
 *
 * @param {Object} deps
 * @param {import("../../bootstrap.js").AppState} deps.state
 * @param {Function}      deps.fetchJson
 * @param {HTMLElement}    deps.chatEl          — container de mensagens
 * @param {HTMLInputElement} deps.imageInputEl  — input file para imagens
 * @param {() => void}    deps.hideTyping
 * @param {() => Promise<void>} deps.loadUsers
 * @param {() => Promise<void>} deps.loadChats
 * @param {(msg: string, opts?: object) => void} deps.showStatus
 * @param {(text: string) => Promise<boolean>}   deps.openConfirmModal
 * @returns {{ getControls: () => { temperature: number, model: string, context: number }, editUserDefaultSystemPrompt: Function, resetar: Function, setupDragAndDrop: Function }}
 */
export function createChatUtilsController({
  state,
  fetchJson,
  chatEl,
  imageInputEl,
  hideTyping,
  loadUsers,
  loadChats,
  showStatus,
  openConfirmModal,
}) {
  const { doFetchWithRetry, fetchJsonBody } = createFetchHelpers(fetchJson, showStatus);

  function getControls() {
    const temp = Number.parseFloat(document.getElementById("temp").value);
    const model = document.getElementById("modelo").value;
    const context = Number.parseInt(document.getElementById("ctx").value, 10);

    return {
      temperature: Number.isFinite(temp) ? temp : 0.7,
      model: model || "meu-llama3",
      context: Number.isFinite(context) ? context : 2048,
    };
  }

  function promptAndStringify(message, defaultValue = "") {
    const input = window.prompt(message, defaultValue);
    if (input === null) return null;
    return String(input || "");
  }

  async function editUserDefaultSystemPrompt() {
    const currentUser = (state.users || []).find((u) => u.id === state.userId);
    const current = String(currentUser?.defaultSystemPrompt || "");
    const defaultSystemPrompt = promptAndStringify(
      "Prompt padrao do perfil (vazio para remover):",
      current,
    );
    if (defaultSystemPrompt === null) return;

    await doFetchWithRetry(
      async () => {
        await fetchJsonBody(
          `/api/users/${encodeURIComponent(state.userId)}/system-prompt-default`,
          "PATCH",
          { defaultSystemPrompt },
        );
        await loadUsers();
      },
      "Prompt padrao do perfil atualizado.",
      "Falha ao atualizar prompt do perfil",
    );
  }

  async function resetar() {
    if (!state.activeChatId) return;

    const confirmed = await openConfirmModal(
      "Tem certeza que deseja limpar todo o historico desta conversa?",
    );
    if (!confirmed) return;

    await doFetchWithRetry(
      async () => {
        await fetchJson(
          `/api/chats/${encodeURIComponent(state.activeChatId)}/reset`,
          { method: "POST" },
        );
        chatEl.innerHTML = "";
        hideTyping();
        await loadChats();
      },
      "Conversa limpa com sucesso.",
      "Nao foi possivel limpar conversa",
    );
  }

  function setupDragAndDrop() {
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      window.addEventListener(eventName, preventDefaults, false);
    });

    window.addEventListener(
      "drop",
      (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files && files.length > 0) {
          const file = files[0];
          if (file.type.startsWith("image/")) {
            imageInputEl.files = files;
            console.log("Imagem anexada via drag and drop:", file.name);
          }
        }
      },
      false,
    );
  }

  return {
    getControls,
    editUserDefaultSystemPrompt,
    resetar,
    setupDragAndDrop,
  };
}
