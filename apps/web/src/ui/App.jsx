import { useReducer } from "react";
import AppMainContent from "./components/AppMainContent.jsx";
import AppShellLayout from "./components/AppShellLayout.jsx";
import useAppLayoutState from "./hooks/useAppLayoutState.js";
import useReactAppWiring from "./hooks/useReactAppWiring.js";
import { INITIAL_UI_STATE, uiReducer } from "./state/ui-state.js";

export default function App() {
  const { menuOpen, openMenu, closeMenu, backdropClassName } = useAppLayoutState();
  const [uiState, dispatch] = useReducer(uiReducer, INITIAL_UI_STATE);
  const { fetchJson, showStatus } = useReactAppWiring({
    uiStatus: uiState.status,
    dispatch,
  });

  return (
    <AppShellLayout
      menuOpen={menuOpen}
      backdropClassName={backdropClassName}
      onCloseMenu={closeMenu}
      onOpenMenu={openMenu}
    >
      <AppMainContent status={uiState.status} fetchJson={fetchJson} showStatus={showStatus} />
    </AppShellLayout>
  );
}
