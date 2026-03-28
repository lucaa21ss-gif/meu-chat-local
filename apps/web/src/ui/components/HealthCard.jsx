import { useEffect, useMemo, useState } from "react";

export default function HealthCard({ fetchJson, onStatus }) {
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
