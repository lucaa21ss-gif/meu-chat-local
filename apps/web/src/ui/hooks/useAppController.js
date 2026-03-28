import { useReducer } from "react";
import useAppLayoutState from "./useAppLayoutState.js";
import useReactAppWiring from "./useReactAppWiring.js";
import {
    APP_CONTROLLER_MODEL_SELECTORS,
} from "../contracts/app-controller-contract.js";
import { INITIAL_UI_STATE, uiReducer } from "../state/ui-state.js";

export { APP_CONTROLLER_MODEL_SELECTORS } from "../contracts/app-controller-contract.js";

export function mapControllerModelSources(sources, selectors) {
  return Object.fromEntries(
    Object.entries(selectors || {}).map(([key, selector]) => [key, selector(sources)]),
  );
}

export function createAppControllerModel({ layout, uiState, fetchJson, showStatus }) {
  return mapControllerModelSources(
    { layout, uiState, fetchJson, showStatus },
    APP_CONTROLLER_MODEL_SELECTORS,
  );
}

export default function useAppController() {
  const layout = useAppLayoutState();
  const [uiState, dispatch] = useReducer(uiReducer, INITIAL_UI_STATE);
  const { fetchJson, showStatus } = useReactAppWiring({
    uiStatus: uiState.status,
    dispatch,
  });

  return createAppControllerModel({
    layout,
    uiState,
    fetchJson,
    showStatus,
  });
}
