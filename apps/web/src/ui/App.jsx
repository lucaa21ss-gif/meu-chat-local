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

const INITIAL_UI_STATE = {
  status: {
    message: "",
    level: "info",
  },
};

function uiReducer(state, action) {
  if (action?.type === "ui/status") {
    return {
      ...state,
      status: {
        message: action.payload?.message || "",
        level: action.payload?.level || "info",
      },
    };
  }

  if (action?.type === "chat/setActive") {
    return state;
  }

  return state;
}

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
          <Route path="/" element={<ChatPage fetchJson={fetchJson} onStatus={showStatus} />} />
          <Route path="/admin" element={<AdminOperationsPanel fetchJson={fetchJson} onStatus={showStatus} />} />
          <Route path="/app" element={<ChatPage fetchJson={fetchJson} onStatus={showStatus} />} />
          <Route path="/produto" element={<ProductPage />} />
          <Route path="/guia" element={<GuidePage />} />
        </Routes>
      </main>
    </div>
  );
}
