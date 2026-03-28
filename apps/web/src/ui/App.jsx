import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { createApiClient } from "../app/shared/api.js";
import { createReactAppWiringContract } from "../app/shared/app-wiring-react.js";

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

function HealthCard({ fetchJson, onStatus }) {
  const [health, setHealth] = useState({ status: "loading" });
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadHealth() {
      try {
        const payload = await fetchJson("/api/health");
        if (mounted) {
          setHealth(payload);
          setError("");
        }
      } catch {
        if (mounted) {
          const message = "Nao foi possivel consultar /api/health";
          setError(message);
          setHealth({ status: "offline" });
          onStatus(message, "warning");
        }
      }
    }

    loadHealth();
    const timer = window.setInterval(loadHealth, 15000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [fetchJson, onStatus]);

  const statusLabel = useMemo(() => {
    const raw = String(health?.status || "unknown").toLowerCase();
    if (raw === "healthy") return "saudavel";
    if (raw === "degraded") return "degradado";
    if (raw === "unhealthy" || raw === "offline") return "indisponivel";
    return "carregando";
  }, [health]);

  return (
    <section className="card">
      <h2>Status do Servidor</h2>
      <p>
        API: <strong>{statusLabel}</strong>
      </p>
      {error ? <p className="error">{error}</p> : null}
      <p className="hint">Consumo por mesma origem em /api para funcionar em celular/tablet na LAN.</p>
    </section>
  );
}

function ChatPage({ fetchJson, onStatus }) {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError("");
    setReply("");
    onStatus("Enviando mensagem...", "info");

    try {
      const payload = await fetchJson("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          model: "meu-llama3",
          temperature: 0.7,
          userId: "user-default",
        }),
      });
      setReply(payload?.response || payload?.message || "Sem resposta no payload.");
      onStatus("Mensagem enviada com sucesso.", "success");
    } catch (err) {
      const detail = err?.message || "Falha ao enviar mensagem para /api/chat.";
      setError(detail);
      onStatus(detail, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2>Chat</h2>
      <form onSubmit={sendMessage} className="chat-form">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Digite sua mensagem..."
          rows={5}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Enviar"}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {reply ? (
        <div className="reply">
          <h3>Resposta</h3>
          <p>{reply}</p>
        </div>
      ) : null}
    </section>
  );
}

function AdminPage({ fetchJson, onStatus }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAdminHealth() {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchJson("/api/health/public");
      setHealth(payload || {});
      onStatus("Status admin atualizado.", "success");
    } catch (err) {
      const detail = err?.message || "Falha ao carregar /api/health/public.";
      setError(detail);
      onStatus(detail, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminHealth();
    const timer = window.setInterval(loadAdminHealth, 30000);
    return () => window.clearInterval(timer);
  }, [fetchJson]);

  const checks = Object.entries(health?.checks || {});

  return (
    <section className="card">
      <div className="admin-header">
        <div>
          <h2>Admin - Health</h2>
          <p className="hint">Recorte inicial de paridade do painel administrativo.</p>
        </div>
        <button type="button" className="ghost" onClick={loadAdminHealth} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="admin-grid">
        <div className="admin-tile">
          <span className="tile-label">Status</span>
          <strong className="tile-value">{String(health?.status || "desconhecido")}</strong>
        </div>
        <div className="admin-tile">
          <span className="tile-label">Atualizado em</span>
          <strong className="tile-value">{new Date().toLocaleTimeString("pt-BR")}</strong>
        </div>
      </div>

      <h3 className="section-title">Checks</h3>
      {checks.length === 0 ? (
        <p className="hint">Nenhum check disponivel.</p>
      ) : (
        <div className="check-list">
          {checks.map(([name, check]) => {
            const isHealthy = check?.status === "healthy";
            return (
              <article key={name} className="check-item">
                <div>
                  <strong className="check-name">{name}</strong>
                  <p className="hint">{check?.message || "Status verificado."}</p>
                </div>
                <span className={`check-badge ${isHealthy ? "ok" : "fail"}`}>
                  {isHealthy ? "Saudavel" : "Falha"}
                </span>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProductPage() {
  const features = [
    "Privacidade local com dados na sua maquina",
    "Modo offline sem dependencia obrigatoria de nuvem",
    "Historico persistente de conversas",
    "Modelos customizaveis com Ollama",
    "Importacao e exportacao em JSON/Markdown",
    "Backup e recuperacao de dados",
    "Suporte a documentos (RAG)",
    "Perfis de usuario e controle de acesso",
    "Health e observabilidade integrados",
    "Auditoria de eventos criticos",
  ];

  return (
    <section className="card">
      <h2>Produto</h2>
      <p>
        Meu Chat Local e um assistente de IA local-first para uso profissional com foco em privacidade,
        resiliencia e operacao em rede domestica.
      </p>

      <h3 className="section-title">Principais Caracteristicas</h3>
      <ul className="feature-list">
        {features.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h3 className="section-title">Requisitos Basicos</h3>
      <ul className="simple-list">
        <li>Node.js 20+</li>
        <li>Ollama instalado e em execucao</li>
        <li>Navegador moderno (Chrome, Firefox, Safari ou Edge)</li>
        <li>Recomendado: 4 GB+ de RAM e espaco para modelos</li>
      </ul>
    </section>
  );
}

function GuidePage() {
  return (
    <section className="card">
      <h2>Guia Rapido</h2>
      <ol className="guide-steps">
        <li>
          <strong>Instale dependencias:</strong>
          <pre>npm install</pre>
        </li>
        <li>
          <strong>Suba o modelo local:</strong>
          <pre>ollama serve</pre>
        </li>
        <li>
          <strong>Inicie API + Web:</strong>
          <pre>npm run dev --workspace apps/api{"\n"}npm run dev --workspace apps/web</pre>
        </li>
        <li>
          <strong>Acesse:</strong> <code>/app</code> para chat e <code>/admin</code> para operacao.
        </li>
      </ol>

      <h3 className="section-title">Atalhos uteis</h3>
      <ul className="simple-list">
        <li>
          <strong>Ctrl+N</strong>: nova conversa
        </li>
        <li>
          <strong>Ctrl+K</strong>: foco em busca
        </li>
        <li>
          <strong>?</strong>: ajuda de atalhos
        </li>
      </ul>
    </section>
  );
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
          <Route path="/admin" element={<AdminPage fetchJson={apiClient.fetchJson} onStatus={showStatus} />} />
          <Route path="/app" element={<ChatPage fetchJson={apiClient.fetchJson} onStatus={showStatus} />} />
          <Route path="/produto" element={<ProductPage />} />
          <Route path="/guia" element={<GuidePage />} />
        </Routes>
      </main>
    </div>
  );
}
