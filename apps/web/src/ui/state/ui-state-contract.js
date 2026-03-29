/**
 * @module ui-state-contract
 * @deprecated Utilize `./ui-contracts.js` diretamente.
 *
 * Este arquivo existe para retrocompatibilidade com testes e código legado.
 * Todos os símbolos são re-exportados de `ui-contracts.js`, o novo
 * ponto único de verdade para contratos de lógica de UI.
 */
export {
  UI_STATUS_LEVELS,
  UI_STATUS_LEVEL_VALUES,
  DEFAULT_UI_STATUS_LEVEL,
  isValidUiStatusLevel,
  normalizeUiStatusLevel,
  normalizeUiStatus,
  UI_STATE_ACTION_TYPES,
  UI_STATE_ACTION_TYPE_VALUES,
  UI_STATE_SHAPE,
  UI_STATE_KEYS,
  UI_STATUS_KEYS,
} from "./ui-contracts.js";
