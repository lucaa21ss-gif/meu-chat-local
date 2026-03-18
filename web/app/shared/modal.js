function getFocusableElements(element) {
  if (!element) return [];

  return Array.from(
    element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled"));
}

function isModalVisible(element) {
  return !!element && !element.classList.contains("hidden");
}

export function createModalPresenter(options = {}) {
  const duplicateModalEl = options.duplicateModalEl || null;
  const duplicateTitleInputEl = options.duplicateTitleInputEl || null;
  const duplicateModeFullEl = options.duplicateModeFullEl || null;
  const duplicateModeUserEl = options.duplicateModeUserEl || null;
  const confirmModalEl = options.confirmModalEl || null;
  const confirmModalTextEl = options.confirmModalTextEl || null;
  const voiceHistoryModalEl = options.voiceHistoryModalEl || null;
  const shortcutsModalEl = options.shortcutsModalEl || null;
  const shortcutsCloseBtnEl = options.shortcutsCloseBtnEl || null;
  const onboardingModalEl = options.onboardingModalEl || null;

  let duplicateResolver = null;
  let confirmResolver = null;

  function handleDuplicateModalKeydown(event) {
    if (event.key !== "Tab") return;

    const focusableElements = getFocusableElements(duplicateModalEl);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey) {
      if (activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      return;
    }

    if (activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function closeDuplicateModal(result = null) {
    if (!duplicateModalEl) return;

    duplicateModalEl.classList.add("modal-exit-active");
    duplicateModalEl.removeEventListener("keydown", handleDuplicateModalKeydown);

    setTimeout(() => {
      duplicateModalEl.classList.remove("modal-exit-active");
      duplicateModalEl.classList.add("hidden");
      duplicateModalEl.classList.remove("flex");

      if (duplicateResolver) {
        const resolve = duplicateResolver;
        duplicateResolver = null;
        resolve(result);
      }
    }, 250);
  }

  function openDuplicateModal(defaultTitle) {
    if (!duplicateModalEl || !duplicateTitleInputEl) {
      return Promise.resolve(null);
    }

    duplicateTitleInputEl.value = defaultTitle;
    if (duplicateModeFullEl) duplicateModeFullEl.checked = true;
    if (duplicateModeUserEl) duplicateModeUserEl.checked = false;

    duplicateModalEl.classList.remove("hidden");
    duplicateModalEl.classList.add("flex");
    duplicateModalEl.classList.add("modal-enter-active");
    duplicateModalEl.addEventListener("keydown", handleDuplicateModalKeydown);

    setTimeout(() => {
      duplicateModalEl.classList.remove("modal-enter-active");
      duplicateTitleInputEl.focus();
      duplicateTitleInputEl.select();
    }, 0);

    return new Promise((resolve) => {
      duplicateResolver = resolve;
    });
  }

  function openConfirmModal(text) {
    if (!confirmModalEl || !confirmModalTextEl) {
      return Promise.resolve(false);
    }

    confirmModalTextEl.textContent = text;
    confirmModalEl.classList.remove("hidden");
    confirmModalEl.classList.add("flex");

    return new Promise((resolve) => {
      confirmResolver = resolve;
    });
  }

  function closeConfirmModal(result) {
    if (!confirmModalEl) return;

    confirmModalEl.classList.add("hidden");
    confirmModalEl.classList.remove("flex");
    if (confirmResolver) {
      const resolve = confirmResolver;
      confirmResolver = null;
      resolve(result);
    }
  }

  function openVoiceHistoryModal() {
    if (!voiceHistoryModalEl) return;
    voiceHistoryModalEl.classList.remove("hidden");
    voiceHistoryModalEl.classList.add("flex");
  }

  function closeVoiceHistoryModal() {
    if (!voiceHistoryModalEl) return;
    voiceHistoryModalEl.classList.add("hidden");
    voiceHistoryModalEl.classList.remove("flex");
  }

  function isVoiceHistoryOpen() {
    return isModalVisible(voiceHistoryModalEl);
  }

  function openShortcutsModal() {
    if (!shortcutsModalEl) return;
    shortcutsModalEl.classList.remove("hidden");
    shortcutsModalEl.classList.add("flex");
    shortcutsCloseBtnEl?.focus();
  }

  function closeShortcutsModal() {
    if (!shortcutsModalEl) return;
    shortcutsModalEl.classList.add("hidden");
    shortcutsModalEl.classList.remove("flex");
  }

  function isShortcutsModalOpen() {
    return isModalVisible(shortcutsModalEl);
  }

  function hasBlockingModalOpen() {
    return (
      isShortcutsModalOpen() ||
      isModalVisible(duplicateModalEl) ||
      isModalVisible(confirmModalEl) ||
      isVoiceHistoryOpen() ||
      isModalVisible(onboardingModalEl)
    );
  }

  function hasDuplicatePending() {
    return !!duplicateResolver;
  }

  function hasConfirmPending() {
    return !!confirmResolver;
  }

  return {
    closeConfirmModal,
    closeDuplicateModal,
    closeShortcutsModal,
    closeVoiceHistoryModal,
    hasBlockingModalOpen,
    hasConfirmPending,
    hasDuplicatePending,
    isShortcutsModalOpen,
    isVoiceHistoryOpen,
    openConfirmModal,
    openDuplicateModal,
    openShortcutsModal,
    openVoiceHistoryModal,
  };
}
