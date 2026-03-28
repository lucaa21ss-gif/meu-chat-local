import { useReducer } from "react";
import { Route, Routes } from "react-router-dom";
import AdminOperationsPanel from "./components/AdminOperationsPanel.jsx";
import AppSidebar from "./components/AppSidebar.jsx";
import AppTopbar from "./components/AppTopbar.jsx";
import ChatPage from "./components/ChatPage.jsx";
import GuidePage from "./components/GuidePage.jsx";
import HealthCard from "./components/HealthCard.jsx";
import ProductPage from "./components/ProductPage.jsx";
import UiStatusBanner from "./components/UiStatusBanner.jsx";
import useAppLayoutState from "./hooks/useAppLayoutState.js";
import useReactAppWiring from "./hooks/useReactAppWiring.js";
import { createRouteElement } from "./routes/route-element-factory.js";
import { ROUTE_DEFINITIONS } from "./routes/navigation.js";
import { INITIAL_UI_STATE, uiReducer } from "./state/ui-state.js";

const ROUTE_COMPONENT_REGISTRY = Object.freeze({
  chat: ChatPage,
  admin: AdminOperationsPanel,
  product: ProductPage,
  guide: GuidePage,
});

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

        <Routes>
          {ROUTE_DEFINITIONS.map((route) => (
            <Route
              key={route.id}
              path={route.path}
              element={createRouteElement(route, { fetchJson, showStatus }, ROUTE_COMPONENT_REGISTRY)}
            />
          ))}
        </Routes>
      </main>
    </div>
  );
}
