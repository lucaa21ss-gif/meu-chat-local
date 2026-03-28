import { useReducer } from "react";
import AppRoutes from "./components/AppRoutes.jsx";
import AppSidebar from "./components/AppSidebar.jsx";
import AppTopbar from "./components/AppTopbar.jsx";
import HealthCard from "./components/HealthCard.jsx";
import UiStatusBanner from "./components/UiStatusBanner.jsx";
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
    <div className="app-shell">
      <div className={backdropClassName} onClick={closeMenu} />
      <AppSidebar menuOpen={menuOpen} onCloseMenu={closeMenu} />

      <main className="content">
        <AppTopbar onOpenMenu={openMenu} />
        <UiStatusBanner status={uiState.status} />

        <HealthCard fetchJson={fetchJson} onStatus={showStatus} />
        <AppRoutes fetchJson={fetchJson} showStatus={showStatus} />
      </main>
    </div>
  );
}
