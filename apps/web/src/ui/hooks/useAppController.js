import { useReducer } from "react";
import useAppLayoutState from "./useAppLayoutState.js";
import useReactAppWiring from "./useReactAppWiring.js";
import { INITIAL_UI_STATE, uiReducer } from "../state/ui-state.js";

export const APP_CONTROLLER_MODEL_SELECTORS = Object.freeze({
  menuOpen: ({ layout }) => layout.menuOpen,
  openMenu: ({ layout }) => layout.openMenu,
  closeMenu: ({ layout }) => layout.closeMenu,
  backdropClassName: ({ layout }) => layout.backdropClassName,
  status: ({ uiState }) => uiState.status,
  fetchJson: ({ fetchJson }) => fetchJson,
  showStatus: ({ showStatus }) => showStatus,
});

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
