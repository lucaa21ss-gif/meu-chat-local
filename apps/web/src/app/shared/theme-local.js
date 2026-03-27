import { normalizeThemeMode } from "./theme.js";
import { createLocalStorage } from "../../infra/local-storage.js";

/**
 * ThemeLocalController — ciclagem de tema (light/dark/system), persistência e sync com sistema.
 *
 * @param {Object} deps
 * @param {import("../../bootstrap.js").AppState} deps.state
 * @param {HTMLButtonElement|null} deps.darkModeBtnEl
 * @param {HTMLElement|null}       deps.sunIconEl
 * @param {HTMLElement|null}       deps.moonIconEl
 * @param {HTMLElement|null}       deps.autoIconEl
 * @param {(mode: string, opts?: object) => void} deps.applyThemeMode
 * @returns {{ updateToggleUi: Function, cycleMode: Function, loadSavedMode: Function }}
 */
export function createThemeLocalController({
  state,
  darkModeBtnEl,
  sunIconEl,
  moonIconEl,
  autoIconEl,
  applyThemeMode,
}) {
  const storage = createLocalStorage();

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
    const saved = normalizeThemeMode(storage.getRaw("themeMode") || "system");
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