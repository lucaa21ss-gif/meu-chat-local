import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { createApiClient } from "../app/shared/api.js";
import { createReactAppWiringContract } from "../app/shared/app-wiring-react.js";
import AdminOperationsPanel from "./components/AdminOperationsPanel.jsx";
import ChatPage from "./components/ChatPage.jsx";
import GuidePage from "./components/GuidePage.jsx";
import HealthCard from "./components/HealthCard.jsx";
import ProductPage from "./components/ProductPage.jsx";

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
  const stateRef = useRef({});

  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      status: uiState.status,
    };
  }, [uiState]);

  const apiClient = useMemo(() => createApiClient({ baseUrl: "" }), []);

  const wiring = useMemo(
    () =>
      createReactAppWiringContract({
        stateRef,
        dispatch,
        fetchers: {
          fetchJson: apiClient.fetchJson,
        },
        elements: {
          statusBarEl: null,
          statusTextEl: null,
          statusRetryBtnEl: null,
          chatEl: null,
          tabsEl: null,
        },
        callbacks: {
          buildChatsQueryString: () => "",
          renderTabs: () => {},
          appendMessage: () => {},
          hideTyping: () => {},
          hideStatus: () => {},
          showStatus: (message) => dispatch({ type: "ui/status", payload: { message, level: "info" } }),
          loadRagDocuments: async () => {},
          runHistorySearch: async () => {},
          clearSearchResults: () => {},
          getCurrentUser: () => null,
          getMainModelSelect: () => null,
          applyThemeMode: () => {},
          openConfirmModal: async () => false,
          openDuplicateModal: async () => null,
          uid: () => `chat-${Date.now()}`,
          onLoadChats: async () => {},
          onSwitchChat: async () => {},
        },
      }),
    [apiClient.fetchJson],
  );

  const showStatus = wiring.reactUi.dispatchStatus;

  return (
    <div className="app-shell">
      <div className={`backdrop ${menuOpen ? "show" : ""}`} onClick={() => setMenuOpen(false)} />

      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h1>Meu Chat Local</h1>
          <button className="ghost lg-hidden" onClick={() => setMenuOpen(false)}>
            Fechar
          </button>
        </div>
        <nav>
          <NavLink to="/" onClick={() => setMenuOpen(false)} end>
            Chat
          </NavLink>
          <NavLink to="/admin" onClick={() => setMenuOpen(false)}>
            Admin
          </NavLink>
          <NavLink to="/produto" onClick={() => setMenuOpen(false)}>
            Produto
          </NavLink>
          <NavLink to="/guia" onClick={() => setMenuOpen(false)}>
            Guia
          </NavLink>
        </nav>
        <p className="hint">Responsivo para desktop, tablet e celular.</p>
      </aside>

      <main className="content">
        <header className="topbar">
          <button className="ghost lg-hidden" onClick={() => setMenuOpen(true)}>
            Menu
          </button>
          <div>
            <strong>Frontend Unico</strong>
            <p>Mesmo host para usuario e admin em rede domestica.</p>
          </div>
          <Link to="/admin" className="pill">
            /admin
          </Link>
        </header>

        {uiState.status.message ? (
          <section className="card">
            <p className="hint">
              Status ({uiState.status.level}): {uiState.status.message}
            </p>
          </section>
        ) : null}

        <HealthCard fetchJson={apiClient.fetchJson} onStatus={showStatus} />

        <Routes>
          <Route path="/" element={<ChatPage fetchJson={apiClient.fetchJson} onStatus={showStatus} />} />
          <Route path="/admin" element={<AdminOperationsPanel fetchJson={apiClient.fetchJson} onStatus={showStatus} />} />
          <Route path="/app" element={<ChatPage fetchJson={apiClient.fetchJson} onStatus={showStatus} />} />
          <Route path="/produto" element={<ProductPage />} />
          <Route path="/guia" element={<GuidePage />} />
        </Routes>
      </main>
    </div>
  );
}
