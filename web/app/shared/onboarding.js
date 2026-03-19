export function createOnboardingController({
  state,
  apiBase,
  onboardingModalEl,
  onboardingModelSelectEl,
  onboardingHealthStatusEl,
  onboardingSmokeStatusEl,
  getMainModelSelect,
  getFallbackModel,
  savePreferredModel,
  showStatus,
  fetchImpl = fetch,
}) {
  function setStatusText(element, text) {
    if (element) {
      element.textContent = text;
    }
  }

  function resetStatus() {
    state.onboardingChecksOk = false;
    setStatusText(onboardingHealthStatusEl, "API: pendente");
    setStatusText(onboardingSmokeStatusEl, "Teste de chat: pendente");
  }

  function syncModels() {
    const mainModelSelect = getMainModelSelect();
    if (!mainModelSelect || !onboardingModelSelectEl) {
      return;
    }

    onboardingModelSelectEl.innerHTML = "";
    Array.from(mainModelSelect.options).forEach((option) => {
      const cloned = document.createElement("option");
      cloned.value = option.value;
      cloned.textContent = option.textContent;
      onboardingModelSelectEl.appendChild(cloned);
    });

    onboardingModelSelectEl.value = mainModelSelect.value;
  }

  function closeModal() {
    if (!onboardingModalEl) {
      return;
    }
    onboardingModalEl.classList.add("hidden");
    onboardingModalEl.classList.remove("flex");
  }

  function openModal() {
    if (!onboardingModalEl) {
      return;
    }
    syncModels();
    resetStatus();
    onboardingModalEl.classList.remove("hidden");
    onboardingModalEl.classList.add("flex");
  }

  function isOpen() {
    return !!onboardingModalEl && !onboardingModalEl.classList.contains("hidden");
  }

  async function runChecks() {
    const selectedModel = onboardingModelSelectEl?.value || getFallbackModel();
    const mainModelSelect = getMainModelSelect();
    if (mainModelSelect && selectedModel) {
      mainModelSelect.value = selectedModel;
      savePreferredModel(selectedModel);
    }

    state.onboardingChecksOk = false;
    setStatusText(onboardingHealthStatusEl, "API: verificando...");
    setStatusText(onboardingSmokeStatusEl, "Teste de chat: aguardando...");

    try {
      const healthResponse = await fetchImpl(`${apiBase}/healthz`);
      if (!healthResponse.ok) {
        throw new Error("API indisponivel");
      }
      setStatusText(onboardingHealthStatusEl, "API: conectada");
    } catch (error) {
      setStatusText(onboardingHealthStatusEl, `API: falha (${error.message})`);
      setStatusText(onboardingSmokeStatusEl, "Teste de chat: cancelado");
      showStatus(`Falha no onboarding: ${error.message}`, { type: "error" });
      return;
    }

    const tempChatId = `onboarding-${Date.now()}`;
    try {
      const smokeResponse = await fetchImpl(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: tempChatId,
          model: selectedModel,
          message: "Responda apenas OK para validar onboarding.",
          temperature: 0,
          context: 512,
        }),
      });

      if (!smokeResponse.ok) {
        throw new Error(`HTTP ${smokeResponse.status}`);
      }

      const payload = await smokeResponse.json();
      const reply = String(payload.reply || "").trim();
      if (!reply) {
        throw new Error("resposta vazia");
      }

      setStatusText(onboardingSmokeStatusEl, `Teste de chat: ok (${reply.slice(0, 24)})`);
      state.onboardingChecksOk = true;
      showStatus("Onboarding validado com sucesso.", { type: "success" });
    } catch (error) {
      setStatusText(onboardingSmokeStatusEl, `Teste de chat: falha (${error.message})`);
      showStatus(`Falha no teste rapido: ${error.message}`, { type: "error" });
    } finally {
      try {
        await fetchImpl(`${apiBase}/api/chats/${encodeURIComponent(tempChatId)}`, {
          method: "DELETE",
        });
      } catch {
        // Ignora falha de limpeza do chat temporario.
      }
    }
  }

  function complete() {
    const selectedModel = onboardingModelSelectEl?.value || "";
    const mainModelSelect = getMainModelSelect();
    if (mainModelSelect && selectedModel) {
      mainModelSelect.value = selectedModel;
      savePreferredModel(selectedModel);
    }

    localStorage.setItem("onboardingDone", "true");
    closeModal();

    if (state.onboardingChecksOk) {
      showStatus("Assistente inicial concluido.", { type: "success" });
      return;
    }

    showStatus("Preferencias salvas. Rode a verificacao quando quiser.", {
      type: "info",
      autoHideMs: 3500,
    });
  }

  function handleBackdropClick(event) {
    if (event.target === onboardingModalEl) {
      closeModal();
    }
  }

  return {
    resetStatus,
    syncModels,
    closeModal,
    openModal,
    isOpen,
    runChecks,
    complete,
    handleBackdropClick,
  };
}
