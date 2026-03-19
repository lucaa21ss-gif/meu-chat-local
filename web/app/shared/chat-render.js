/**
 * Chat render controller - handles message bubbles, avatars, typing indicator, and tab rendering
 * Factory pattern with dependency injection for testability and loose coupling
 */

export function createChatRenderController({
  state,
  chatEl,
  typingEl,
  tabsEl,
  tabsMobileEl,
  favoriteBtnEl,
  archiveBtnEl,
  switchChat,
  smoothScrollToBottom,
  updateChatListPaginationUi,
}) {
  function openModalElement(element) {
    if (!element) return;
    element.classList.remove("hidden");
    element.classList.add("flex");
  }

  function closeModalElement(element) {
    if (!element) return;
    element.classList.add("hidden");
    element.classList.remove("flex");
  }

  function showTyping() {
    openModalElement(typingEl);
  }

  function hideTyping() {
    closeModalElement(typingEl);
  }

  function createAvatar(role) {
    const avatar = document.createElement("div");
    avatar.className =
      role === "user"
        ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white shadow-sm"
        : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-sm";
    avatar.textContent = role === "user" ? "VOCE" : "IA";
    return avatar;
  }

  function appendMessage(role, content, options = {}) {
    const wrapper = document.createElement("div");
    wrapper.className =
      role === "user" ? "flex justify-end" : "flex justify-start";

    const row = document.createElement("div");
    row.className =
      role === "user"
        ? "flex max-w-[95%] items-end gap-2 sm:max-w-[80%]"
        : "flex max-w-[95%] items-end gap-2 sm:max-w-[85%]";

    const bubble = document.createElement("article");
    bubble.className =
      role === "user"
        ? "rounded-2xl rounded-br-md bg-gradient-to-br from-teal-600 to-teal-700 px-4 py-3 text-sm text-white shadow-lg shadow-teal-900/10 animate-bubble-in"
        : "rounded-2xl rounded-bl-md bg-white/40 px-4 py-3 text-sm text-slate-800 ring-1 ring-white/50 backdrop-blur-md shadow-sm animate-bubble-in dark:bg-slate-800/40 dark:text-slate-200 dark:ring-slate-700/50";

    const label = document.createElement("p");
    label.className =
      role === "user"
        ? "mb-1 text-[11px] font-semibold uppercase tracking-wide text-teal-100"
        : "mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
    label.textContent = role === "user" ? "Usuario" : "Assistente";

    const contentEl = document.createElement("div");
    contentEl.className = "whitespace-pre-wrap leading-relaxed";
    contentEl.textContent = content;

    bubble.appendChild(label);
    bubble.appendChild(contentEl);

    if (Array.isArray(options.images) && options.images.length > 0) {
      const gallery = document.createElement("div");
      gallery.className = "mt-2 grid grid-cols-2 gap-2";

      options.images.slice(0, 4).forEach((imageSrc, idx) => {
        const preview = document.createElement("img");
        preview.src = imageSrc;
        preview.alt = `Imagem enviada ${idx + 1}`;
        preview.className =
          "max-h-44 w-full rounded-lg border border-white/20 object-cover";
        gallery.appendChild(preview);
      });

      bubble.appendChild(gallery);
    }

    const actionsRow = document.createElement("div");
    actionsRow.className = "mt-2 flex flex-wrap gap-2";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className =
      "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700";
    copyBtn.textContent = "Copiar mensagem";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(contentEl.textContent || "");
        copyBtn.textContent = "Copiado";
        setTimeout(() => {
          copyBtn.textContent = "Copiar mensagem";
        }, 1200);
      } catch (err) {
        console.error(err);
      }
    });
    actionsRow.appendChild(copyBtn);

    if (role === "assistant") {
      const speakBtn = document.createElement("button");
      speakBtn.type = "button";
      speakBtn.className =
        "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700";
      speakBtn.textContent = "Ouvir resposta";
      speakBtn.addEventListener("click", () => {
        const text = (contentEl.textContent || "").trim();
        if (!text) return;

        if (!("speechSynthesis" in window)) {
          speakBtn.textContent = "TTS indisponivel";
          setTimeout(() => {
            speakBtn.textContent = "Ouvir resposta";
          }, 1500);
          return;
        }

        const synthesis = window.speechSynthesis;
        if (synthesis.speaking) {
          synthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "pt-BR";
        utterance.rate = 1;
        utterance.pitch = 1;

        speakBtn.textContent = "Lendo...";
        utterance.onend = () => {
          speakBtn.textContent = "Ouvir resposta";
        };
        utterance.onerror = () => {
          speakBtn.textContent = "Falha ao ler";
          setTimeout(() => {
            speakBtn.textContent = "Ouvir resposta";
          }, 1200);
        };

        synthesis.speak(utterance);
      });

      actionsRow.appendChild(speakBtn);

      if (Array.isArray(options.sources) && options.sources.length > 0) {
        const citationsWrap = document.createElement("div");
        citationsWrap.className =
          "mt-2 rounded-lg border border-amber-200 bg-amber-50/70 px-2 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200";

        const title = document.createElement("p");
        title.className = "font-semibold uppercase tracking-wide";
        title.textContent = "Fontes";
        citationsWrap.appendChild(title);

        options.sources.forEach((source) => {
          const item = document.createElement("p");
          item.className = "mt-1 whitespace-pre-wrap";
          item.textContent = `${source.documentName}#trecho${source.chunkIndex}: ${source.snippet}`;
          citationsWrap.appendChild(item);
        });

        bubble.appendChild(citationsWrap);
      }
    }

    bubble.appendChild(actionsRow);

    if (role === "user") {
      row.appendChild(bubble);
      row.appendChild(createAvatar(role));
    } else {
      row.appendChild(createAvatar(role));
      row.appendChild(bubble);
    }

    wrapper.appendChild(row);
    chatEl.appendChild(wrapper);
    smoothScrollToBottom();

    return contentEl;
  }

  function renderTabs() {
    tabsEl.innerHTML = "";
    if (tabsMobileEl) tabsMobileEl.innerHTML = "";

    state.chats.forEach((chat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        chat.id === state.activeChatId
          ? "w-full rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-left text-sm font-semibold text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-400"
          : "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700";

      const markers = [];
      if (chat.isFavorite) markers.push("★");
      if (chat.archivedAt) markers.push("📦");
      if (Array.isArray(chat.tags) && chat.tags.length > 0) {
        markers.push(`#${chat.tags[0]}`);
      }
      btn.textContent =
        `${markers.join(" ")} ${chat.title || "Nova conversa"}`.trim();
      btn.addEventListener("click", () => switchChat(chat.id));
      tabsEl.appendChild(btn);

      if (tabsMobileEl) {
        const compact = document.createElement("button");
        compact.type = "button";
        compact.className =
          chat.id === state.activeChatId
            ? "rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 whitespace-nowrap dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-400"
            : "rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
        compact.textContent = chat.isFavorite
          ? `★ ${chat.title || "Nova"}`
          : chat.title || "Nova";
        compact.addEventListener("click", () => switchChat(chat.id));
        tabsMobileEl.appendChild(compact);
      }
    });

    const activeChat = state.chats.find((chat) => chat.id === state.activeChatId);
    if (favoriteBtnEl) {
      favoriteBtnEl.textContent = activeChat?.isFavorite
        ? "Desfavoritar aba"
        : "Favoritar aba";
    }
    if (archiveBtnEl) {
      archiveBtnEl.textContent = activeChat?.archivedAt
        ? "Desarquivar aba"
        : "Arquivar aba";
    }

    updateChatListPaginationUi();
    requestAnimationFrame(() => {
      if (tabsEl) {
        tabsEl.scrollTop = state.chatList.scrollTop;
      }
    });
  }

  return {
    showTyping,
    hideTyping,
    createAvatar,
    appendMessage,
    renderTabs,
  };
}
