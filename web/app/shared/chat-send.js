async function streamChatResponse({
  apiBase,
  activeChatId,
  text,
  controls,
  images,
  targetEl,
  onChunk,
}) {
  const response = await fetch(`${apiBase}/api/chat-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId: activeChatId,
      message: text,
      temperature: controls.temperature,
      model: controls.model,
      context: controls.context,
      images,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Falha na resposta do servidor");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    targetEl.textContent += chunk;
    onChunk();
  }
}

export function createChatSendController({
  state,
  inputEl,
  imageInputEl,
  sendBtnEl,
  ragToggleEl,
  apiBase,
  fetchJson,
  filesToBase64,
  appendMessage,
  showTyping,
  hideTyping,
  smoothScrollToBottom,
  showStatus,
  hideStatus,
  getControls,
  onEnsureActiveChat,
  onLoadChats,
  getRetryAction,
}) {
  async function enviar() {
    const texto = inputEl.value.trim();
    if (!texto) return;

    if (!state.activeChatId) {
      await onEnsureActiveChat();
    }

    inputEl.value = "";
    inputEl.focus();
    sendBtnEl.disabled = true;

    const selectedFiles = Array.from(imageInputEl.files || []).slice(0, 4);
    const encodedImages = await filesToBase64(selectedFiles);
    const imagePayload = encodedImages.map((item) => item.base64);
    const previewImages = encodedImages.map(
      (item) => `data:${item.mimeType};base64,${item.base64}`,
    );
    imageInputEl.value = "";

    appendMessage("user", texto, {
      images: previewImages,
    });
    const iaSpan = appendMessage("assistant", "");
    showTyping();

    try {
      const controls = getControls();
      const ragEnabled = Boolean(ragToggleEl?.checked) && state.rag.docCount > 0;

      if (ragEnabled) {
        const payload = await fetchJson("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: state.activeChatId,
            message: texto,
            temperature: controls.temperature,
            model: controls.model,
            context: controls.context,
            images: imagePayload,
            ragEnabled: true,
            ragTopK: 3,
          }),
        });

        iaSpan.textContent = payload.reply || "";
        if (Array.isArray(payload.citations) && payload.citations.length > 0) {
          const wrapper = iaSpan.parentElement;
          if (wrapper) {
            const refs = document.createElement("p");
            refs.className = "mt-2 text-xs text-amber-700 dark:text-amber-300";
            refs.textContent = `Fontes: ${payload.citations.map((item) => `${item.documentName}#trecho${item.chunkIndex}`).join(", ")}`;
            wrapper.appendChild(refs);
          }
        }

        await onLoadChats();
        hideStatus();
        return;
      }

      await streamChatResponse({
        apiBase,
        activeChatId: state.activeChatId,
        text: texto,
        controls,
        images: imagePayload,
        targetEl: iaSpan,
        onChunk: () => smoothScrollToBottom(),
      });

      await onLoadChats();
      hideStatus();
    } catch (error) {
      iaSpan.textContent =
        "Nao foi possivel gerar resposta agora. Tente novamente.";
      showStatus(`Falha ao gerar resposta: ${error.message}`, {
        type: "error",
        retryAction: async () => {
          try {
            showTyping();
            iaSpan.textContent = "";

            await streamChatResponse({
              apiBase,
              activeChatId: state.activeChatId,
              text: texto,
              controls: getControls(),
              images: imagePayload,
              targetEl: iaSpan,
              onChunk: () => smoothScrollToBottom(),
            });

            await onLoadChats();
            hideStatus();
          } catch (retryError) {
            iaSpan.textContent =
              "Nao foi possivel gerar resposta agora. Tente novamente.";
            showStatus(`Falha ao tentar novamente: ${retryError.message}`, {
              type: "error",
              retryAction: getRetryAction(),
            });
          } finally {
            hideTyping();
            sendBtnEl.disabled = false;
          }
        },
      });
      console.error(error);
    } finally {
      hideTyping();
      sendBtnEl.disabled = false;
    }
  }

  return {
    enviar,
  };
}