import { normalizeThemeMode } from "./theme.js";
import { createLocalStorage } from "../../infra/local-storage.js";

/**
 * PreferencesController — modelo preferido, tema por perfil, sincronização de preferências.
 *
 * @param {Object} deps
 * @param {import("../../bootstrap.js").AppState} deps.state
 * @param {Function}      deps.fetchJson
 * @param {() => object}  deps.getCurrentUser
 * @param {() => HTMLSelectElement} deps.getMainModelSelect
 * @param {(mode: string, opts?: object) => void} deps.applyThemeMode
 * @returns {{ getPreferredModel, savePreferredModel, applyPreferredModel, saveThemeForCurrentUser, syncThemeFromCurrentUser }}
 */
export function createPreferencesController({
  state,
  fetchJson,
  getCurrentUser,
  getMainModelSelect,
  applyThemeMode,
}) {
  const storage = createLocalStorage();

  function getPreferredModel() {
    return storage.getRaw("preferredModel") || "";
  }

  function savePreferredModel(model) {
    if (!model) return;
    storage.setRaw("preferredModel", model);
  }

  function applyPreferredModel() {
    const preferred = getPreferredModel();
    if (!preferred) return;

    const modelSelect = getMainModelSelect();
    if (!modelSelect) return;
    const exists = Array.from(modelSelect.options).some(
      (opt) => opt.value === preferred,
    );
    if (exists) {
      modelSelect.value = preferred;
    }
  }

  async function saveThemeForCurrentUser(theme) {
    if (!state.userId) return;
    await fetchJson(`/api/users/${encodeURIComponent(state.userId)}/ui-preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
    const current = getCurrentUser();
    if (current) current.theme = theme;
  }

  function syncThemeFromCurrentUser() {
    const user = getCurrentUser();
    const profileTheme = normalizeThemeMode(user?.theme || "system");
    applyThemeMode(profileTheme, { persistLocal: true });
  }

  return {
    getPreferredModel,
    savePreferredModel,
    applyPreferredModel,
    saveThemeForCurrentUser,
    syncThemeFromCurrentUser,
  };
}
