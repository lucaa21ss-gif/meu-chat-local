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