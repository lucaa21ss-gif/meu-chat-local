import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";

function HealthCard() {
  const [health, setHealth] = useState({ status: "loading" });
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadHealth() {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (mounted) {
          setHealth(payload);
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError("Nao foi possivel consultar /api/health");
          setHealth({ status: "offline" });
        }
      }
    }

    loadHealth();
    const timer = window.setInterval(loadHealth, 15000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

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

function ChatPage() {
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

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          model: "meu-llama3",
          temperature: 0.7,
          userId: "user-default",
        }),
      });
      if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);
      const payload = await response.json();
      setReply(payload?.response || payload?.message || "Sem resposta no payload.");
    } catch (err) {
      setError("Falha ao enviar mensagem para /api/chat.");
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

function AdminPage() {
  return (
    <section className="card">
      <h2>Admin</h2>
      <p>Interface administrativa unificada em rota /admin no mesmo frontend React.</p>
      <ul>
        <li>Saude e observabilidade via /api/health</li>
        <li>Governanca e operacoes sem app separado</li>
        <li>Pronto para evoluir RBAC de telas</li>
      </ul>
    </section>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

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
          <a href="/produto">Produto</a>
          <a href="/guia">Guia</a>
        </nav>
        <p className="hint">Responsivo para desktop, tablet e celular.</p>
      </aside>

      <main className="content">
        <header className="topbar">
          <button className="ghost lg-hidden" onClick={() => setMenuOpen(true)}>
            Menu
          </button>
          <div>
            <strong>Frontend Unico React</strong>
            <p>Mesmo host para usuario e admin em rede domestica.</p>
          </div>
          <Link to="/admin" className="pill">
            /admin
          </Link>
        </header>

        <HealthCard />

        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/app" element={<ChatPage />} />
          <Route path="/produto" element={<ChatPage />} />
          <Route path="/guia" element={<ChatPage />} />
        </Routes>
      </main>
    </div>
  );
}
