import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { createApiClient } from "../app/shared/api.js";
import { createReactAppWiringContract } from "../app/shared/app-wiring-react.js";
import AdminOperationsPanel from "./components/AdminOperationsPanel.jsx";
import AppSidebar from "./components/AppSidebar.jsx";
import AppTopbar from "./components/AppTopbar.jsx";
import ChatPage from "./components/ChatPage.jsx";
import GuidePage from "./components/GuidePage.jsx";
import HealthCard from "./components/HealthCard.jsx";
import ProductPage from "./components/ProductPage.jsx";
import UiStatusBanner from "./components/UiStatusBanner.jsx";

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
      <AppSidebar menuOpen={menuOpen} onCloseMenu={() => setMenuOpen(false)} />

      <main className="content">
        <AppTopbar onOpenMenu={() => setMenuOpen(true)} />
        <UiStatusBanner status={uiState.status} />

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
