/**
 * @module ui-contracts
 *
 * Ponto único de verdade para os contratos de lógica de UI.
 * Consolida `status-level-contract` e `ui-state-contract` em um arquivo,
 * eliminando redundância e facilitando manutenção.
 *
 * ⚠️  Labels/Copy de UI (mensagens visíveis ao usuário) permanecem nos
 *     arquivos `*-ui-contract.js` específicos por domínio, para facilitar
 *     futura internacionalização (i18n).
 */

/* ─── STATUS LEVELS ──────────────────────────────────────────────────────── */

/**
 * Níveis válidos de status da UI.
 * Espelhado nos tokens CSS `--color-status-{level}-*` no style.css.
 * @type {Readonly<{INFO:'info', SUCCESS:'success', WARNING:'warning', ERROR:'error'}>}
 */
export const UI_STATUS_LEVELS = Object.freeze({
  INFO:    "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR:   "error",
});

/** Valores ordenados de UI_STATUS_LEVELS (para testes de alinhamento). */
export const UI_STATUS_LEVEL_VALUES = Object.freeze(
  Object.values(UI_STATUS_LEVELS).sort(),
);

/** Nível padrão, usado quando nenhum é fornecido. */
export const DEFAULT_UI_STATUS_LEVEL = UI_STATUS_LEVELS.INFO;

/** @param {string} level @returns {boolean} */
export function isValidUiStatusLevel(level) {
  return UI_STATUS_LEVEL_VALUES.includes(level);
}

/** @param {string} level @returns {string} */
export function normalizeUiStatusLevel(level) {
  return isValidUiStatusLevel(level) ? level : DEFAULT_UI_STATUS_LEVEL;
}

/**
 * @param {{ message?: string, level?: string }} status
 * @returns {{ message: string, level: string }}
 */
export function normalizeUiStatus(status) {
  return {
    message: status?.message ?? "",
    level:   normalizeUiStatusLevel(status?.level),
  };
}

/* ─── UI STATE CONTRACT ──────────────────────────────────────────────────── */

/**
 * Tipos de ação do reducer de UI.
 * @type {Readonly<{STATUS: 'ui/status', CHAT_ACTIVE: 'chat/setActive'}>}
 */
export const UI_STATE_ACTION_TYPES = Object.freeze({
  STATUS:      "ui/status",
  CHAT_ACTIVE: "chat/setActive",
});

/** Valores ordenados dos tipos (para testes de alinhamento). */
export const UI_STATE_ACTION_TYPE_VALUES = Object.freeze(
  Object.values(UI_STATE_ACTION_TYPES).sort(),
);

/**
 * Forma canônica do estado inicial de UI.
 * @type {Readonly<{status: Readonly<{message: string, level: string}>}>}
 */
export const UI_STATE_SHAPE = Object.freeze({
  status: Object.freeze({
    message: "",
    level:   DEFAULT_UI_STATUS_LEVEL,
  }),
});

/** Chaves raiz do estado ordenadas (para testes). */
export const UI_STATE_KEYS = Object.freeze(
  Object.keys(UI_STATE_SHAPE).sort(),
);

/** Chaves do objeto `status` ordenadas (para testes). */
export const UI_STATUS_KEYS = Object.freeze(
  Object.keys(UI_STATE_SHAPE.status).sort(),
);
