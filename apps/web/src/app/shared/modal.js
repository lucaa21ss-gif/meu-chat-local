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

export function createModalPresenter(options = {}) {
  const MODAL_ELEMENT_NAMES = [
    "duplicateModal", "duplicateTitleInput", "duplicateModeFullEl", "duplicateModeUser",
    "confirmModal", "confirmModalText", "voiceHistoryModal", "shortcutsModal",
    "shortcutsCloseBtn", "onboardingModal",
  ];

  const modalElements = Object.fromEntries(
    MODAL_ELEMENT_NAMES.map(name => [
      name.replace(/El$/, "El"), 
      options[name + "El"] || options[name] || null
    ])
  );

  const {
    duplicateModalEl, duplicateTitleInputEl, duplicateModeFullEl, duplicateModeUserEl,
    confirmModalEl, confirmModalTextEl, voiceHistoryModalEl, shortcutsModalEl,
    shortcutsCloseBtnEl, onboardingModalEl,
  } = modalElements;

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
    openModalElement(confirmModalEl);

    return new Promise((resolve) => {
      confirmResolver = resolve;
    });
  }

  function closeConfirmModal(result) {
    if (!confirmModalEl) return;

    closeModalElement(confirmModalEl);
    if (confirmResolver) {
      const resolve = confirmResolver;
      confirmResolver = null;
      resolve(result);
    }
  }

  function openVoiceHistoryModal() {
    openModalElement(voiceHistoryModalEl);
  }

  function closeVoiceHistoryModal() {
    closeModalElement(voiceHistoryModalEl);
  }

  function isVoiceHistoryOpen() {
    return isModalVisible(voiceHistoryModalEl);
  }

  function openShortcutsModal() {
    if (!shortcutsModalEl) return;
    openModalElement(shortcutsModalEl);
    shortcutsCloseBtnEl?.focus();
  }

  function closeShortcutsModal() {
    closeModalElement(shortcutsModalEl);
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
