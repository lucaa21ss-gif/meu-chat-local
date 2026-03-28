import {
  UI_STATE_ACTION_TYPES,
  UI_STATE_SHAPE,
} from "./ui-state-contract.js";
import { normalizeUiStatus } from "./status-level-contract.js";

export const INITIAL_UI_STATE = {
  ...UI_STATE_SHAPE,
};

export function uiReducer(state, action) {
  if (action?.type === UI_STATE_ACTION_TYPES.STATUS) {
    const nextStatus = normalizeUiStatus(action.payload);
    return {
      ...state,
      status: nextStatus,
    };
  }

  if (action?.type === UI_STATE_ACTION_TYPES.CHAT_ACTIVE) {
    return state;
  }

  return state;
}
