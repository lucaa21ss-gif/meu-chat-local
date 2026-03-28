import { useEffect, useMemo, useState } from "react";
import { UI_STATUS_LEVELS } from "../contracts/index.js";
import { API_ENDPOINTS } from "../state/api-endpoints-contract.js";
import {
  HEALTH_STATUSES,
  getHealthStatusLabel,
} from "../state/health-status-contract.js";

export default function HealthCard({ fetchJson, onStatus }) {
  const [health, setHealth] = useState({ status: HEALTH_STATUSES.LOADING });
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadHealth() {
      try {
        const payload = await fetchJson(API_ENDPOINTS.HEALTH);
        if (mounted) {
          setHealth(payload);
          setError("");
        }
      } catch {
        if (mounted) {
          const message = `Nao foi possivel consultar ${API_ENDPOINTS.HEALTH}`;
          setError(message);
          setHealth({ status: HEALTH_STATUSES.OFFLINE });
          onStatus(message, UI_STATUS_LEVELS.WARNING);
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
    return getHealthStatusLabel(health?.status);
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
