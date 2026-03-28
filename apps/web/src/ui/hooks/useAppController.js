import { useReducer } from "react";
import useAppLayoutState from "./useAppLayoutState.js";
import useReactAppWiring from "./useReactAppWiring.js";
import { INITIAL_UI_STATE, uiReducer } from "../state/ui-state.js";

export function createAppControllerModel({ layout, uiState, fetchJson, showStatus }) {
  return {
    menuOpen: layout.menuOpen,
    openMenu: layout.openMenu,
    closeMenu: layout.closeMenu,
    backdropClassName: layout.backdropClassName,
    status: uiState.status,
    fetchJson,
    showStatus,
  };
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
