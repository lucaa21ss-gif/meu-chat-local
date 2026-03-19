import { createFetchHelpers } from "./fetch-helpers.js";

function appendHighlightedText(container, text, query, escapeRegExp) {
  const safeText = String(text || "");
  if (!query) {
    container.textContent = safeText;
    return;
  }

  const regex = new RegExp(`(${escapeRegExp(query)})`, "ig");
  const parts = safeText.split(regex);

  for (const part of parts) {
    if (!part) continue;
    if (part.toLowerCase() === query.toLowerCase()) {
      const mark = document.createElement("mark");
      mark.className = "rounded bg-amber-200/70 px-0.5 text-slate-900";
      mark.textContent = part;
      container.appendChild(mark);
    } else {
      container.appendChild(document.createTextNode(part));
    }
  }
}

export function createHistorySearchController(options = {}) {
  const ELEMENT_NAMES = [
    "searchResults", "searchPageInfo", "searchPrevBtn", "searchNextBtn",
    "searchInput", "searchRole", "searchFrom", "searchTo",
  ];
  const elements = Object.fromEntries(
    ELEMENT_NAMES.map(name => [name + "El", options[name + "El"] || null])
  );
  const {
    searchResultsEl, searchPageInfoEl, searchPrevBtnEl, searchNextBtnEl,
    searchInputEl, searchRoleEl, searchFromEl, searchToEl,
  } = elements;
  
  const state = options.state;
  const fetchJson = options.fetchJson;
  const showStatus = options.showStatus;
  const hideStatus = options.hideStatus;
  const formatDateLabel = options.formatDateLabel;
  const escapeRegExp = options.escapeRegExp;
  const getActiveChatId =
    options.getActiveChatId || (() => state?.activeChatId || null);

  const { doFetchWithRetry } = createFetchHelpers(fetchJson, showStatus);

  function clearSearchResults() {
    state.search.page = 1;
    state.search.total = 0;
    state.search.totalPages = 0;

    if (searchResultsEl) {
      searchResultsEl.innerHTML = "";
      searchResultsEl.classList.add("hidden");
    }
    if (searchPageInfoEl) {
      searchPageInfoEl.textContent = "Sem resultados de busca.";
    }
    if (searchPrevBtnEl) searchPrevBtnEl.disabled = true;
    if (searchNextBtnEl) searchNextBtnEl.disabled = true;
  }

  function renderSearchResults(matches = []) {
    if (!searchResultsEl) return;

    searchResultsEl.innerHTML = "";
    if (!matches.length) {
      searchResultsEl.classList.add("hidden");
      return;
    }

    searchResultsEl.classList.remove("hidden");

    matches.forEach((item) => {
      const card = document.createElement("article");
      card.className =
        "rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-700 dark:bg-slate-900/40";

      const meta = document.createElement("p");
      meta.className =
        "mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
      const roleLabel = item.role === "assistant" ? "Assistente" : "Usuario";
      const dateLabel = formatDateLabel(item.createdAt);
      meta.textContent = dateLabel ? `${roleLabel} • ${dateLabel}` : roleLabel;

      const content = document.createElement("p");
      content.className =
        "whitespace-pre-wrap text-slate-700 dark:text-slate-200";
      appendHighlightedText(content, item.content, state.search.query, escapeRegExp);

      card.appendChild(meta);
      card.appendChild(content);
      searchResultsEl.appendChild(card);
    });
  }

  function updateSearchPaginationUi() {
    const { page, totalPages, total } = state.search;

    if (searchPageInfoEl) {
      if (total > 0) {
        searchPageInfoEl.textContent = `Resultados: ${total} • Pagina ${page}/${totalPages}`;
      } else if (state.search.query) {
        searchPageInfoEl.textContent = "Nenhum resultado para os filtros atuais.";
      } else {
        searchPageInfoEl.textContent = "Sem resultados de busca.";
      }
    }

    if (searchPrevBtnEl) searchPrevBtnEl.disabled = page <= 1;
    if (searchNextBtnEl) {
      searchNextBtnEl.disabled = totalPages === 0 || page >= totalPages;
    }
  }

  async function runHistorySearch(runOptions = {}) {
    const { resetPage = false } = runOptions;
    const activeChatId = getActiveChatId();
    if (!activeChatId) return;

    const query = (searchInputEl?.value || "").trim();
    const role = searchRoleEl?.value || "all";
    const from = searchFromEl?.value || "";
    const to = searchToEl?.value || "";

    state.search.query = query;
    state.search.role = role;
    state.search.from = from;
    state.search.to = to;
    if (resetPage) state.search.page = 1;

    if (!query) {
      clearSearchResults();
      return;
    }

    const params = new URLSearchParams({
      q: query,
      role,
      limit: String(state.search.limit),
      page: String(state.search.page),
    });

    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());

    await doFetchWithRetry(
      async () => {
        const data = await fetchJson(
          `/api/chats/${encodeURIComponent(activeChatId)}/search?${params.toString()}`,
        );

        const pagination = data.pagination || {};
        state.search.total = Number.parseInt(pagination.total, 10) || 0;
        state.search.totalPages = Number.parseInt(pagination.totalPages, 10) || 0;
        state.search.page =
          Number.parseInt(pagination.page, 10) || state.search.page;

        renderSearchResults(data.matches || []);
        updateSearchPaginationUi();
        hideStatus();
      },
      null,
      "Falha na busca",
    ).catch(() => {});
  }

  return {
    clearSearchResults,
    runHistorySearch,
  };
}
