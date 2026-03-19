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

    try {
      await fetchJson(
        `/api/users/${encodeURIComponent(state.userId)}/system-prompt-default`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultSystemPrompt }),
        },
      );

      await loadUsers();
      showStatus("Prompt padrao do perfil atualizado.", { type: "success" });
    } catch (error) {
      showStatus(`Falha ao atualizar prompt do perfil: ${error.message}`, {
        type: "error",
      });
    }
  }

  async function resetar() {
    if (!state.activeChatId) return;

    const confirmed = await openConfirmModal(
      "Tem certeza que deseja limpar todo o historico desta conversa?",
    );
    if (!confirmed) return;

    try {
      await fetchJson(
        `/api/chats/${encodeURIComponent(state.activeChatId)}/reset`,
        { method: "POST" },
      );
      chatEl.innerHTML = "";
      hideTyping();
      await loadChats();
      showStatus("Conversa limpa com sucesso.", { type: "success" });
    } catch (error) {
      showStatus(`Nao foi possivel limpar conversa: ${error.message}`, {
        type: "error",
        retryAction: () => resetar(),
      });
      throw error;
    }
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
