/**
 * VoiceController — ditado por voz e histórico de transcrições.
 *
 * Migrado para usar os adapters de `src/infra/`:
 *   - `createSTTAdapter` para reconhecimento de voz
 *   - `createLocalStorage` para persistência do histórico
 *
 * @param {Object} deps
 * @param {import("../../bootstrap.js").AppState} deps.state
 * @param {HTMLTextAreaElement} deps.inputEl
 * @param {HTMLButtonElement}   deps.voiceBtnEl
 * @param {HTMLElement}         deps.voiceHistoryListEl
 * @param {() => void}         deps.openVoiceHistoryModal
 * @param {() => void}         deps.closeVoiceHistoryModal
 * @param {() => void}         deps.onUpdateSendButtonState
 * @returns {{ saveHistory, loadHistory, renderHistory, openHistoryModalWithRender, clearHistory, setupInput }}
 */

import { createSTTAdapter } from "../../infra/speech.js";
import { createLocalStorage } from "../../infra/local-storage.js";

export function createVoiceController({
  state,
  inputEl,
  voiceBtnEl,
  voiceHistoryListEl,
  openVoiceHistoryModal,
  closeVoiceHistoryModal,
  onUpdateSendButtonState,
}) {
  const storage = createLocalStorage();
  const stt = createSTTAdapter({ lang: "pt-BR" });

  function saveHistory(text) {
    if (!text || text.length < 2) return;
    if (state.voiceHistory[0] === text) return;

    state.voiceHistory.unshift(text);
    if (state.voiceHistory.length > 50) {
      state.voiceHistory.pop();
    }

    storage.setJSON("voiceHistory", state.voiceHistory);
  }

  function loadHistory() {
    state.voiceHistory = storage.getJSON("voiceHistory", []);
  }

  function renderHistory() {
    voiceHistoryListEl.innerHTML = "";

    if (state.voiceHistory.length === 0) {
      voiceHistoryListEl.innerHTML =
        '<p class="py-8 text-center text-sm text-slate-400 italic">Nenhuma transcricao salva ainda.</p>';
      return;
    }

    state.voiceHistory.forEach((text) => {
      const container = document.createElement("div");
      container.className =
        "group relative flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:bg-teal-50 hover:border-teal-200 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-teal-950/30 dark:hover:border-teal-900";

      const textEl = document.createElement("p");
      textEl.className =
        "line-clamp-2 text-sm text-slate-700 cursor-pointer dark:text-slate-300";
      textEl.textContent = text;
      textEl.addEventListener("click", () => {
        inputEl.value = text;
        onUpdateSendButtonState();
        closeVoiceHistoryModal();
        inputEl.focus();
      });

      const controls = document.createElement("div");
      controls.className = "flex justify-end gap-2";

      if (text.length > 60) {
        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className =
          "text-[10px] font-bold uppercase tracking-wider text-teal-600 hover:underline";
        toggleBtn.textContent = "Expandir";
        toggleBtn.addEventListener("click", () => {
          if (textEl.classList.contains("line-clamp-2")) {
            textEl.classList.remove("line-clamp-2");
            toggleBtn.textContent = "Recolher";
          } else {
            textEl.classList.add("line-clamp-2");
            toggleBtn.textContent = "Expandir";
          }
        });
        controls.appendChild(toggleBtn);
      }

      container.appendChild(textEl);
      container.appendChild(controls);
      voiceHistoryListEl.appendChild(container);
    });
  }

  function openHistoryModalWithRender() {
    renderHistory();
    openVoiceHistoryModal();
  }

  function clearHistory() {
    state.voiceHistory = [];
    storage.remove("voiceHistory");
    renderHistory();
  }

  function setupInput() {
    if (!stt.isAvailable) {
      voiceBtnEl.disabled = true;
      voiceBtnEl.textContent = "Voz indisponivel neste navegador";
      return;
    }

    stt.onResult((transcript, isFinal) => {
      inputEl.value = transcript;
      if (isFinal) saveHistory(transcript);
    });

    stt.onStateChange((listening) => {
      state.isListening = listening;
      voiceBtnEl.textContent = listening ? "Parar ditado" : "Iniciar ditado";
    });

    voiceBtnEl.addEventListener("click", () => {
      if (state.isListening) {
        stt.stop();
      } else {
        stt.start();
      }
    });
  }

  return {
    saveHistory,
    loadHistory,
    renderHistory,
    openHistoryModalWithRender,
    clearHistory,
    setupInput,
  };
}