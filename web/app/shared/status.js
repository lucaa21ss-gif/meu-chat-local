const BASE_CLASS_NAME =
  "mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm sm:mx-6";

const STATUS_CLASS_MAP = {
  error: [
    "border-rose-300",
    "bg-rose-50",
    "text-rose-700",
    "dark:border-rose-900",
    "dark:bg-rose-950/30",
    "dark:text-rose-300",
  ],
  success: [
    "border-emerald-300",
    "bg-emerald-50",
    "text-emerald-700",
    "dark:border-emerald-900",
    "dark:bg-emerald-950/30",
    "dark:text-emerald-300",
  ],
  info: [
    "border-slate-300",
    "bg-slate-50",
    "text-slate-700",
    "dark:border-slate-700",
    "dark:bg-slate-900/30",
    "dark:text-slate-300",
  ],
};

export function createStatusPresenter(options = {}) {
  const STATUS_ELEMENT_NAMES = ["statusBar", "statusText", "statusRetryBtn"];
  const statusElements = Object.fromEntries(
    STATUS_ELEMENT_NAMES.map(name => [name + "El", options[name + "El"] || null])
  );
  const { statusBarEl, statusTextEl, statusRetryBtnEl } = statusElements;
  let retryAction = null;
  let statusTimer = null;

  function clearTimer() {
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
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

  function hideStatus() {
    if (!statusBarEl) return;
    closeModalElement(statusBarEl);
    retryAction = null;
    clearTimer();
  }

  function showStatus(message, showOptions = {}) {
    if (!statusBarEl || !statusTextEl) return;

    const type = showOptions.type || "error";
    const nextRetryAction = showOptions.retryAction || null;
    const autoHideMs = showOptions.autoHideMs ?? (type === "success" ? 3000 : 0);
    const traceId = showOptions.traceId || null;
    const displayText =
      traceId && type === "error"
        ? `${message} [ocorrencia: ${traceId.slice(0, 8)}]`
        : message;

    statusTextEl.textContent = displayText;
    openModalElement(statusBarEl);
    statusBarEl.className = BASE_CLASS_NAME;

    const classNames = STATUS_CLASS_MAP[type] || STATUS_CLASS_MAP.info;
    statusBarEl.classList.add(...classNames);

    retryAction = nextRetryAction;
    if (statusRetryBtnEl) {
      statusRetryBtnEl.classList.toggle("hidden", !nextRetryAction);
    }

    clearTimer();
    if (autoHideMs > 0) {
      statusTimer = setTimeout(() => {
        hideStatus();
      }, autoHideMs);
    }
  }

  function getRetryAction() {
    return retryAction;
  }

  return {
    hideStatus,
    showStatus,
    getRetryAction,
  };
}