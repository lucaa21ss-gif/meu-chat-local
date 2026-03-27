export function bindSearchButtons({
  state,
  searchBtnEl,
  searchInputEl,
  searchClearBtnEl,
  searchPrevBtnEl,
  searchNextBtnEl,
  searchRoleEl,
  searchFromEl,
  searchToEl,
  runHistorySearch,
  clearSearchResults,
}) {
  function runSearchWith(resetPage) {
    runHistorySearch({ resetPage }).catch((error) => {
      console.error(error);
    });
  }

  if (searchBtnEl) {
    searchBtnEl.addEventListener("click", () => {
      runSearchWith(true);
    });
  }
  if (searchInputEl) {
    searchInputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        runSearchWith(true);
      }
    });
  }
  if (searchClearBtnEl) {
    searchClearBtnEl.addEventListener("click", () => {
      if (searchInputEl) searchInputEl.value = "";
      if (searchRoleEl) searchRoleEl.value = "all";
      if (searchFromEl) searchFromEl.value = "";
      if (searchToEl) searchToEl.value = "";
      state.search.query = "";
      clearSearchResults();
    });
  }
  if (searchPrevBtnEl) {
    searchPrevBtnEl.addEventListener("click", () => {
      if (state.search.page <= 1) return;
      state.search.page -= 1;
      runSearchWith(false);
    });
  }
  if (searchNextBtnEl) {
    searchNextBtnEl.addEventListener("click", () => {
      if (state.search.totalPages === 0 || state.search.page >= state.search.totalPages) return;
      state.search.page += 1;
      runSearchWith(false);
    });
  }
}