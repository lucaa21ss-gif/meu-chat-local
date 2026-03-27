/**
 * ChatFiltersController — controla filtros de listagem (todos, favoritos, arquivados, por tag).
 *
 * @param {Object} deps
 * @param {import("../../bootstrap.js").AppState} deps.state
 * @param {HTMLButtonElement|null} deps.filterAllBtnEl
 * @param {HTMLButtonElement|null} deps.filterFavoritesBtnEl
 * @param {HTMLButtonElement|null} deps.filterArchivedBtnEl
 * @param {HTMLInputElement|null}  deps.filterTagInputEl
 * @param {() => void}            deps.onResetPagination
 * @param {() => Promise<void>}   deps.onLoadChats
 * @returns {{ updateUi: Function, setMode: (mode: "all"|"favorites"|"archived") => Promise<void>, applyTagFilter: (tag: string) => Promise<void> }}
 */
export function createChatFiltersController({
  state,
  filterAllBtnEl,
  filterFavoritesBtnEl,
  filterArchivedBtnEl,
  filterTagInputEl,
  onResetPagination,
  onLoadChats,
}) {
  function updateUi() {
    const isAll = state.chatFilters.mode === "all";
    const isFavorites = state.chatFilters.mode === "favorites";
    const isArchived = state.chatFilters.mode === "archived";

    if (filterAllBtnEl) filterAllBtnEl.classList.toggle("bg-slate-100", isAll);
    if (filterFavoritesBtnEl) {
      filterFavoritesBtnEl.classList.toggle("bg-slate-100", isFavorites);
    }
    if (filterArchivedBtnEl) {
      filterArchivedBtnEl.classList.toggle("bg-slate-100", isArchived);
    }

    if (filterTagInputEl) {
      filterTagInputEl.value = state.chatFilters.tag;
    }
  }

  async function setMode(mode) {
    state.chatFilters.mode = mode;
    onResetPagination();
    updateUi();
    await onLoadChats();
  }

  async function applyTagFilter(rawTag) {
    state.chatFilters.tag = String(rawTag || "").trim();
    onResetPagination();
    await onLoadChats();
  }

  return {
    updateUi,
    setMode,
    applyTagFilter,
  };
}