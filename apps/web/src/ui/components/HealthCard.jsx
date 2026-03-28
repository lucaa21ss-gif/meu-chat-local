import { useEffect, useMemo, useState } from "react";
import { UI_STATUS_LEVELS } from "../contracts/index.js";
import { API_ENDPOINTS } from "../state/api-endpoints-contract.js";
import {
  HEALTH_STATUSES,
  getHealthStatusLabel,
} from "../state/health-status-contract.js";
import { POLLING_INTERVALS_MS } from "../state/polling-contract.js";
import {
  HEALTH_CARD_COPY,
  buildHealthFetchErrorMessage,
} from "../state/health-card-ui-contract.js";

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
          const message = buildHealthFetchErrorMessage(API_ENDPOINTS.HEALTH);
          setError(message);
          setHealth({ status: HEALTH_STATUSES.OFFLINE });
          onStatus(message, UI_STATUS_LEVELS.WARNING);
        }
      }
    }

    loadHealth();
    const timer = window.setInterval(loadHealth, POLLING_INTERVALS_MS.HEALTH_CARD);
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
      <h2>{HEALTH_CARD_COPY.TITLE}</h2>
      <p>
        {HEALTH_CARD_COPY.API_LABEL} <strong>{statusLabel}</strong>
      </p>
      {error ? <p className="error">{error}</p> : null}
      <p className="hint">{HEALTH_CARD_COPY.LAN_HINT}</p>
    </section>
  );
}
