function isTextInputLike(element) {
  if (!element) return false;

  const tag = String(element.tagName || "").toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    element.isContentEditable === true
  );
}

function isAltShiftShortcut(event, expectedKey) {
  return (
    event.altKey &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    String(event.key || "").toLowerCase() === expectedKey
  );
}

function focusElement(element) {
  if (!element) return;
  element.focus();
  element.select?.();
}

function buildShortcutDefinitions(options) {
  return [
    {
      keys: "Shift+?",
      description: "Abrir a ajuda de atalhos",
      match: (event) =>
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.shiftKey &&
        (event.key === "?" || event.code === "Slash"),
      run: () => options.openShortcutsModal?.(),
    },
    {
      keys: "Alt+Shift+N",
      description: "Criar nova conversa",
      match: (event) => isAltShiftShortcut(event, "n"),
      run: () => options.onCreateNewChat?.(),
    },
    {
      keys: "Alt+Shift+F",
      description: "Focar a busca no historico",
      match: (event) => isAltShiftShortcut(event, "f"),
      run: () => focusElement(options.searchInputEl),
    },
    {
      keys: "Alt+Shift+M",
      description: "Focar a caixa de mensagem",
      match: (event) => isAltShiftShortcut(event, "m"),
      run: () => focusElement(options.inputEl),
    },
    {
      keys: "Alt+Shift+ArrowUp",
      description: "Ir para a aba anterior",
      match: (event) => isAltShiftShortcut(event, "arrowup"),
      run: () => options.onNavigateRelativeTab?.(-1),
    },
    {
      keys: "Alt+Shift+ArrowDown",
      description: "Ir para a proxima aba",
      match: (event) => isAltShiftShortcut(event, "arrowdown"),
      run: () => options.onNavigateRelativeTab?.(1),
    },
    {
      keys: "Alt+Shift+D",
      description: "Duplicar a aba ativa",
      match: (event) => isAltShiftShortcut(event, "d"),
      run: () => options.onDuplicateActiveChat?.(),
    },
    {
      keys: "Esc",
      description: "Fechar o modal aberto",
      helpOnly: true,
    },
  ];
}

export function createShortcutsController(options = {}) {
  const shortcutDefinitions = buildShortcutDefinitions(options);

  function renderShortcutsHelp() {
    const shortcutsListEl = options.shortcutsListEl;
    if (!shortcutsListEl) return;

    shortcutsListEl.innerHTML = "";
    shortcutDefinitions.forEach((shortcut) => {
      const item = document.createElement("li");
      item.className =
        "flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70";

      const description = document.createElement("span");
      description.className = "text-sm text-slate-700 dark:text-slate-200";
      description.textContent = shortcut.description;

      const keys = document.createElement("kbd");
      keys.className =
        "rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200";
      keys.textContent = shortcut.keys;

      item.append(description, keys);
      shortcutsListEl.appendChild(item);
    });
  }

  function handleGlobalShortcuts(event) {
    if (event.key === "Escape") {
      if (options.isShortcutsModalOpen?.()) {
        event.preventDefault();
        options.closeShortcutsModal?.();
        return;
      }
      if (options.hasDuplicatePending?.()) {
        event.preventDefault();
        options.closeDuplicateModal?.(null);
        return;
      }
      if (options.hasConfirmPending?.()) {
        event.preventDefault();
        options.closeConfirmModal?.(false);
        return;
      }
      if (options.isVoiceHistoryOpen?.()) {
        event.preventDefault();
        options.closeVoiceHistoryModal?.();
        return;
      }
      if (options.isOnboardingOpen?.()) {
        event.preventDefault();
        options.closeOnboardingModal?.();
      }
      return;
    }

    if (isTextInputLike(event.target) || options.hasBlockingModalOpen?.()) {
      return;
    }

    const shortcut = shortcutDefinitions.find(
      (entry) => !entry.helpOnly && entry.match?.(event),
    );
    if (!shortcut) return;

    event.preventDefault();
    shortcut.run?.();
  }

  return {
    handleGlobalShortcuts,
    renderShortcutsHelp,
    shortcutDefinitions,
  };
}
