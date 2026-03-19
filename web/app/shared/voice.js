export function createVoiceController({
  state,
  inputEl,
  voiceBtnEl,
  voiceHistoryListEl,
  openVoiceHistoryModal,
  closeVoiceHistoryModal,
  onUpdateSendButtonState,
}) {
  function saveHistory(text) {
    if (!text || text.length < 2) return;
    if (state.voiceHistory[0] === text) return;

    state.voiceHistory.unshift(text);
    if (state.voiceHistory.length > 50) {
      state.voiceHistory.pop();
    }

    localStorage.setItem("voiceHistory", JSON.stringify(state.voiceHistory));
  }

  function loadHistory() {
    const saved = localStorage.getItem("voiceHistory");
    if (saved) {
      try {
        state.voiceHistory = JSON.parse(saved);
      } catch {
        state.voiceHistory = [];
      }
    }
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
    localStorage.removeItem("voiceHistory");
    renderHistory();
  }

  function setupInput() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      voiceBtnEl.disabled = true;
      voiceBtnEl.textContent = "Voz indisponivel neste navegador";
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      inputEl.value = transcript.trim();

      if (event.results[0].isFinal) {
        saveHistory(transcript.trim());
      }
    };

    recognition.onstart = () => {
      state.isListening = true;
      voiceBtnEl.textContent = "Parar ditado";
    };

    recognition.onend = () => {
      state.isListening = false;
      voiceBtnEl.textContent = "Iniciar ditado";
    };

    state.recognition = recognition;

    voiceBtnEl.addEventListener("click", () => {
      if (!state.recognition) return;

      if (state.isListening) {
        state.recognition.stop();
        return;
      }

      state.recognition.start();
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