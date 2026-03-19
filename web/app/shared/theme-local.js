import { normalizeThemeMode } from "./theme.js";

export function createThemeLocalController({
  state,
  darkModeBtnEl,
  sunIconEl,
  moonIconEl,
  autoIconEl,
  applyThemeMode,
}) {
  function updateToggleUi(mode) {
    const safeMode = normalizeThemeMode(mode);
    if (sunIconEl) sunIconEl.classList.toggle("hidden", safeMode !== "light");
    if (moonIconEl) moonIconEl.classList.toggle("hidden", safeMode !== "dark");
    if (autoIconEl) autoIconEl.classList.toggle("hidden", safeMode !== "system");

    if (darkModeBtnEl) {
      const labels = {
        light: "Tema: claro",
        dark: "Tema: escuro",
        system: "Tema: sistema",
      };
      darkModeBtnEl.title = labels[safeMode];
    }
  }

  function cycleMode() {
    const order = ["light", "dark", "system"];
    const idx = order.indexOf(normalizeThemeMode(state.themeMode));
    const next = order[(idx + 1) % order.length];
    applyThemeMode(next, { persistLocal: true });
    return next;
  }

  function loadSavedMode() {
    const saved = normalizeThemeMode(localStorage.getItem("themeMode") || "system");
    applyThemeMode(saved, { persistLocal: false });

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (state.themeMode === "system") {
          applyThemeMode("system", { persistLocal: false });
        }
      });
  }

  return {
    updateToggleUi,
    cycleMode,
    loadSavedMode,
  };
}