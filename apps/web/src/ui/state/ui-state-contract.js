/**
 * UI State Reducer Contract
 *
 * Defines the frozen action type registry and state shape for the ui reducer.
 * Ensures type safety and alignment across state mutations.
 */

import { DEFAULT_UI_STATUS_LEVEL } from "./status-level-contract.js";
export {
  UI_STATUS_LEVELS,
  UI_STATUS_LEVEL_VALUES,
  DEFAULT_UI_STATUS_LEVEL,
} from "./status-level-contract.js";

/**
 * Reducer action type identifiers
 * @type {Readonly<{STATUS: 'ui/status', CHAT_ACTIVE: 'chat/setActive'}>}
 */
export const UI_STATE_ACTION_TYPES = Object.freeze({
  STATUS: "ui/status",
  CHAT_ACTIVE: "chat/setActive",
});

/**
 * Derived sorted array of action type values for alignment tests
 * Automatically maintains sync with UI_STATE_ACTION_TYPES
 * @type {ReadonlyArray<string>}
 */
export const UI_STATE_ACTION_TYPE_VALUES = Object.freeze(
  Object.values(UI_STATE_ACTION_TYPES).sort()
);

/**
 * UI state shape contract
 * Defines the expected structure of INITIAL_UI_STATE
 * @type {Readonly<{status: Readonly<{message: string, level: string}>}>}
 */
export const UI_STATE_SHAPE = Object.freeze({
  status: Object.freeze({
    message: "",
    level: DEFAULT_UI_STATUS_LEVEL,
  }),
});

/**
 * Derived sorted array of root state keys
 * @type {ReadonlyArray<string>}
 */
export const UI_STATE_KEYS = Object.freeze(
  Object.keys(UI_STATE_SHAPE).sort()
);

/**
 * Derived sorted array of status object keys
 * @type {ReadonlyArray<string>}
 */
export const UI_STATUS_KEYS = Object.freeze(
  Object.keys(UI_STATE_SHAPE.status).sort()
);
