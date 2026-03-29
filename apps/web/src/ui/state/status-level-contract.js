/**
 * @module status-level-contract
 * @deprecated Utilize `./ui-contracts.js` diretamente.
 *
 * Shim de retrocompatibilidade. Todos os símbolos são re-exportados
 * de `ui-contracts.js`, o novo ponto único de verdade.
 */
export {
  UI_STATUS_LEVELS,
  UI_STATUS_LEVEL_VALUES,
  DEFAULT_UI_STATUS_LEVEL,
  isValidUiStatusLevel,
  normalizeUiStatusLevel,
  normalizeUiStatus,
} from "./ui-contracts.js";