import { useReducer, useState } from "react";
import { Route, Routes } from "react-router-dom";
import AdminOperationsPanel from "./components/AdminOperationsPanel.jsx";
import AppSidebar from "./components/AppSidebar.jsx";
import AppTopbar from "./components/AppTopbar.jsx";
import ChatPage from "./components/ChatPage.jsx";
import GuidePage from "./components/GuidePage.jsx";
import HealthCard from "./components/HealthCard.jsx";
import ProductPage from "./components/ProductPage.jsx";
import UiStatusBanner from "./components/UiStatusBanner.jsx";
import useReactAppWiring from "./hooks/useReactAppWiring.js";
import { ROUTE_PATHS } from "./routes/navigation.js";
import { INITIAL_UI_STATE, uiReducer } from "./state/ui-state.js";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [uiState, dispatch] = useReducer(uiReducer, INITIAL_UI_STATE);
  const { fetchJson, showStatus } = useReactAppWiring({
    uiStatus: uiState.status,
    dispatch,
  });

  return (
    <div className="app-shell">
      <div className={`backdrop ${menuOpen ? "show" : ""}`} onClick={() => setMenuOpen(false)} />
      <AppSidebar menuOpen={menuOpen} onCloseMenu={() => setMenuOpen(false)} />

      <main className="content">
        <AppTopbar onOpenMenu={() => setMenuOpen(true)} />
        <UiStatusBanner status={uiState.status} />

        <HealthCard fetchJson={fetchJson} onStatus={showStatus} />

        <Routes>
          <Route path={ROUTE_PATHS.chat} element={<ChatPage fetchJson={fetchJson} onStatus={showStatus} />} />
          <Route path={ROUTE_PATHS.admin} element={<AdminOperationsPanel fetchJson={fetchJson} onStatus={showStatus} />} />
          <Route path={ROUTE_PATHS.chatAlias} element={<ChatPage fetchJson={fetchJson} onStatus={showStatus} />} />
          <Route path={ROUTE_PATHS.product} element={<ProductPage />} />
          <Route path={ROUTE_PATHS.guide} element={<GuidePage />} />
        </Routes>
      </main>
    </div>
  );
}
