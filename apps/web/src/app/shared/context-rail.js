/* global window, document, console */

export function normalizeHealthSummary(status) {
  const normalized = String(status || "unknown").toLowerCase();
  if (["ok", "healthy", "up", "pass"].includes(normalized)) return "ok";
  if (["warn", "warning", "degraded"].includes(normalized)) return "alerta";
  if (["error", "down", "fail", "failing"].includes(normalized)) return "falha";
  return "desconhecido";
}

export function formatSelectionSnippet(selectedText) {
  if (!selectedText) {
    return "";
  }
  return selectedText.length > 160
    ? `${selectedText.slice(0, 160)}...`
    : selectedText;
}

export function buildQuickPrompt(basePrompt, selectedText) {
  if (!selectedText) {
    return basePrompt;
  }
  return `${basePrompt}\n\nTrecho de contexto:\n"""\n${selectedText}\n"""`;
}

function setPipelineStepState(stepEl, stateClass) {
  if (!stepEl) return;
  stepEl.classList.remove("is-done", "is-active");
  if (stateClass) {
    stepEl.classList.add(stateClass);
  }
}

function getSelectedContextText() {
  const selectedText = window.getSelection?.()?.toString()?.trim() || "";
  return selectedText.slice(0, 280);
}

function createQuickActionPresets() {
  return {
    explain: "Explique o trecho selecionado e destaque riscos e trade-offs.",
    refactor: "Sugira um refactor incremental com passos pequenos e testes necessarios.",
    tests: "Gere casos de teste para o comportamento principal e para cenarios de falha.",
  };
}

export function createContextRailController({
  state,
  inputEl,
  searchInputEl,
  ragToggleEl,
  modelEl,
  ctxEl,
  tempEl,
  appBindingsController,
  chatUtilsController,
  hasBlockingModalOpen,
  ui,
}) {
  const quickActionPresets = createQuickActionPresets();
  let syncTimer = null;

  function applyQuickPrompt(promptText) {
    if (!inputEl) return;
    inputEl.value = promptText;
    inputEl.focus();
    inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
    appBindingsController.updateSendButtonState();
    render();
  }

  function applyQuickPromptFromSelection(basePrompt) {
    const selectedText = getSelectedContextText();
    applyQuickPrompt(buildQuickPrompt(basePrompt, selectedText));
  }

  function renderEvidence() {
    const { evidenceListEl } = ui;
    if (!evidenceListEl) return;

    const evidenceItems = [];
    const selectedText = getSelectedContextText();
    const activeChat = state.chats.find((chat) => chat.id === state.activeChatId);

    if (activeChat?.title) {
      evidenceItems.push(`Conversa ativa: ${activeChat.title}`);
    }

    if (selectedText) {
      evidenceItems.push(`Selecao ativa: "${formatSelectionSnippet(selectedText)}"`);
    }

    if (state.rag?.enabled && Number.isFinite(state.rag?.docCount)) {
      evidenceItems.push(`Base RAG: ${state.rag.docCount} documento(s) disponiveis`);
    }

    if (state.search?.query) {
      evidenceItems.push(`Filtro de busca aplicado: "${state.search.query}"`);
    }

    if (evidenceItems.length === 0) {
      evidenceItems.push("Nenhuma evidencia selecionada ainda.");
      evidenceItems.push("Use prompts com arquivo/simbolo para enriquecer contexto.");
    }

    evidenceListEl.textContent = "";
    evidenceItems.forEach((item) => {
      const rowEl = document.createElement("li");
      rowEl.className = "ai-evidence-item";
      rowEl.textContent = item;
      evidenceListEl.appendChild(rowEl);
    });
  }

  function render() {
    if (!ui.activeTitleEl) return;

    const controls = chatUtilsController.getControls();
    const activeChat = state.chats.find((chat) => chat.id === state.activeChatId);
    const selectedText = getSelectedContextText();
    const model = controls.model || "-";
    const healthText = normalizeHealthSummary(state.health?.status || state.ollamaStatus);
    const chatLabel = activeChat?.title || "sem selecao";
    const hasInput = Boolean(inputEl?.value?.trim());
    const hasChat = Boolean(state.activeChatId);
    const healthReady = healthText === "ok" || healthText === "alerta";

    ui.activeTitleEl.textContent = `Modelo ${model} | ctx ${controls.ctx} | temp ${controls.temperature}`;
    if (ui.chipModelEl) ui.chipModelEl.textContent = `Modelo: ${model}`;
    if (ui.chipChatEl) ui.chipChatEl.textContent = `Conversa: ${chatLabel}`;
    if (ui.chipHealthEl) ui.chipHealthEl.textContent = `Saude: ${healthText}`;
    if (ui.chipSelectionEl) {
      ui.chipSelectionEl.textContent = selectedText ? "Selecao: sim" : "Selecao: nao";
      ui.chipSelectionEl.classList.toggle("is-active", Boolean(selectedText));
    }

    setPipelineStepState(ui.stepAnalyzeEl, hasInput || hasChat ? "is-done" : "is-active");
    setPipelineStepState(ui.stepBuildEl, hasInput ? "is-active" : hasChat ? "is-done" : "");
    setPipelineStepState(ui.stepValidateEl, healthReady ? "is-done" : "");

    renderEvidence();
  }

  function shouldIgnoreQuickActionShortcut(event) {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return true;
    }
    if (hasBlockingModalOpen()) {
      return true;
    }
    const activeTag = document.activeElement?.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA" || document.activeElement?.isContentEditable) {
      return true;
    }
    return false;
  }

  function handleQuickActionHotkeys(event) {
    if (shouldIgnoreQuickActionShortcut(event)) {
      return;
    }

    if (event.key === "1") {
      event.preventDefault();
      applyQuickPromptFromSelection(quickActionPresets.explain);
      return;
    }

    if (event.key === "2") {
      event.preventDefault();
      applyQuickPromptFromSelection(quickActionPresets.refactor);
      return;
    }

    if (event.key === "3") {
      event.preventDefault();
      applyQuickPromptFromSelection(quickActionPresets.tests);
    }
  }

  function bind() {
    ui.quickExplainBtnEl?.addEventListener("click", () => {
      applyQuickPromptFromSelection(quickActionPresets.explain);
    });

    ui.quickRefactorBtnEl?.addEventListener("click", () => {
      applyQuickPromptFromSelection(quickActionPresets.refactor);
    });

    ui.quickTestBtnEl?.addEventListener("click", () => {
      applyQuickPromptFromSelection(quickActionPresets.tests);
    });

    inputEl?.addEventListener("input", render);
    searchInputEl?.addEventListener("input", render);
    ragToggleEl?.addEventListener("change", render);
    modelEl?.addEventListener("change", render);
    ctxEl?.addEventListener("change", render);
    tempEl?.addEventListener("change", render);
    document.addEventListener("selectionchange", render);
    document.addEventListener("keydown", handleQuickActionHotkeys);
  }

  function start() {
    bind();
    syncTimer = window.setInterval(() => {
      try {
        render();
      } catch (error) {
        console.warn("Falha ao atualizar painel de contexto:", error);
      }
    }, 1500);
  }

  function stop() {
    if (syncTimer) {
      window.clearInterval(syncTimer);
      syncTimer = null;
    }
  }

  return {
    render,
    start,
    stop,
  };
}
