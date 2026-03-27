/**
 * Bootstrap — inicialização e DI container da aplicação web.
 *
 * Centraliza a resolução de referências DOM e a exposição do state
 * para que `script.js` fique apenas como entrypoint fino.
 *
 * Responsabilidades:
 *   1. Mapear IDs do DOM para referências de elementos
 *   2. Construir e expor o state (domain + ui) com proxy retrocompatível
 *   3. Instanciar o API client com a base URL correta
 *
 * NÃO instancia controllers — isso permanece em `script.js` por enquanto,
 * pois sua refatoração completa é trabalho da Fase 3 (DI container formal).
 *
 * @module bootstrap
 */

import { createApiClient } from "./src/app/shared/api.js";
import { createLocalStorage } from "./src/infra/local-storage.js";

/* ─── 1. DOM element resolver ─────────────────────────────── */

/**
 * Resolve uma lista de IDs de DOM em um objeto { idEl: HTMLElement }.
 * @param {string[]} ids
 * @returns {Record<string, HTMLElement|null>}
 */
export function createElementRefs(ids) {
  return Object.fromEntries(
    ids.map((id) => [id + "El", document.getElementById(id)]),
  );
}

/** Lista canônica de todos os IDs de elementos usados pela aplicação */
export const DOM_ELEMENT_IDS = [
  "chat", "msg", "typing", "sendBtn", "chatTabs", "newChatBtn", "exportBtn",
  "exportJsonBtn", "exportAllJsonBtn", "exportFavoritesMdBtn", "importJsonBtn",
  "chatTabsMobile", "newChatBtnMobile", "duplicateBtn", "duplicateBtnMobile",
  "renameBtn", "deleteBtn", "systemPromptBtn", "renameBtnMobile", "deleteBtnMobile",
  "exportBtnMobile", "exportJsonBtnMobile", "exportAllJsonBtnMobile",
  "exportFavoritesMdBtnMobile", "backupBtn", "restoreBackupBtn", "backupBtnMobile",
  "restoreBackupBtnMobile", "backupRestoreInput", "importJsonBtnMobile", "voiceBtn",
  "voiceHistoryBtn", "imageInput", "favoriteBtn", "archiveBtn", "tagsBtn",
  "duplicateModal", "duplicateTitleInput", "duplicateModeFull", "duplicateModeUser",
  "duplicateCancelBtn", "duplicateConfirmBtn", "voiceHistoryModal", "voiceHistoryList",
  "voiceHistoryCloseBtn", "clearVoiceHistoryBtn", "confirmModal", "confirmModalText",
  "confirmCancelBtn", "confirmOkBtn", "onboardingModal", "ollamaStatusBadge",
  "systemHealthBadge", "ollamaLatencyText", "statusBar", "statusText", "statusRetryBtn",
  "userPromptBtn", "shortcutsHelpBtn", "shortcutsModal", "shortcutsCloseBtn",
  "shortcutsList", "userSelect", "darkModeBtn", "sunIcon", "moonIcon", "autoIcon",
  "storageUsageText", "storageAlertText", "storageRefreshBtn", "storageCleanupBtn",
  "storageLimitBtn", "telemetryOptIn", "telemetryStatsBtn", "auditExportBtn",
  "configHistoryBtn", "diagnosticsExportBtn", "healthRefreshBtn", "healthSummaryText",
  "healthChecksText", "healthSloText", "filterAllBtn", "filterFavoritesBtn",
  "filterArchivedBtn", "filterTagInput", "filterTagApplyBtn", "chatListSearchInput",
  "chatListPaginationInfo", "chatListLoadMoreBtn", "searchInput", "searchRole",
  "searchFrom", "searchTo", "searchBtn", "searchClearBtn", "searchPageInfo",
  "searchPrevBtn", "searchNextBtn", "searchResults", "ragToggle", "docInput",
  "docUploadBtn", "ragStatus", "newUserBtn", "renameUserBtn", "deleteUserBtn",
  "onboardingBtn", "onboardingModelSelect", "onboardingHealthStatus",
  "onboardingSmokeStatus", "onboardingRunChecksBtn", "onboardingSkipBtn",
  "onboardingCompleteBtn",
];

/* ─── 2. State (domain + ui) ──────────────────────────────── */

/**
 * Estado de DOMÍNIO — dados persistíveis, testáveis sem DOM.
 */
export function createDomainState() {
  const storage = createLocalStorage();
  return {
    chats: [],
    activeChatId: null,
    userId: storage.getRaw("chatUserId") || "user-default",
    users: [],
    themeMode: storage.getRaw("themeMode") || "system",
    isDarkMode: false,
    voiceHistory: [],
    rag: { enabled: false, docCount: 0 },
    telemetryEnabled: false,
    storage: {
      dbBytes: 0, uploadsBytes: 0, documentsBytes: 0,
      backupsBytes: 0, totalBytes: 0, storageLimitMb: 512, usagePercent: 0,
    },
    health: {
      status: "unknown",
      checks: { db: { status: "unknown" }, model: { status: "unknown" }, disk: { status: "unknown" } },
      alerts: [],
    },
    ollamaStatus: "unknown",
    healthLatencyMs: null,
  };
}

/**
 * Estado de UI — dados voláteis, transientes.
 */
export function createUiState() {
  return {
    recognition: null,
    isListening: false,
    onboardingChecksOk: false,
    healthPoller: null,
    search: {
      query: "", role: "all", from: "", to: "",
      page: 1, limit: 5, totalPages: 0, total: 0,
    },
    chatFilters: { mode: "all", tag: "" },
    chatList: {
      search: "", page: 1, limit: 20,
      total: 0, totalPages: 0, scrollTop: 0, searchTimer: null,
    },
  };
}

/**
 * Proxy unificado — mantém compatibilidade retroativa.
 */
export function createStateProxy(domainState, uiState) {
  return new Proxy({}, {
    get(_, prop) {
      if (prop in domainState) return domainState[prop];
      if (prop in uiState)     return uiState[prop];
      return undefined;
    },
    set(_, prop, value) {
      if (prop in domainState) { domainState[prop] = value; return true; }
      if (prop in uiState)     { uiState[prop] = value; return true; }
      uiState[prop] = value;
      return true;
    },
    has(_, prop) {
      return prop in domainState || prop in uiState;
    },
    ownKeys() {
      return [...new Set([...Object.keys(domainState), ...Object.keys(uiState)])];
    },
    getOwnPropertyDescriptor(_, prop) {
      if (prop in domainState || prop in uiState) {
        return { configurable: true, enumerable: true, writable: true };
      }
    },
  });
}

/* ─── 3. API Client ───────────────────────────────────────── */

/**
 * Inicializa todos os componentes de infraestrutura base.
 * @returns {{ elements, state, domainState, uiState, fetchJson }}
 */
export function initializeApp() {
  const elements   = createElementRefs(DOM_ELEMENT_IDS);
  const domainState = createDomainState();
  const uiState     = createUiState();
  const state       = createStateProxy(domainState, uiState);

  const API_BASE = window.location.origin;
  const { fetchJson } = createApiClient({ baseUrl: API_BASE });

  return { elements, state, domainState, uiState, fetchJson };
}
