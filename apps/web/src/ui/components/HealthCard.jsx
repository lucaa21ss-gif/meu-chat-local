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

function resolveHealthLevel(status) {
  if (status === HEALTH_STATUSES.HEALTHY) return "success";
  if (status === HEALTH_STATUSES.LOADING) return "info";
  return "error";
}

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

  const statusLabel = useMemo(() => getHealthStatusLabel(health?.status), [health]);

  return (
    <section className="glass-surface rounded-2xl p-4 animate-fade-slide-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="ai-gradient-text text-base font-semibold m-0">{HEALTH_CARD_COPY.TITLE}</h2>
          <p className="ai-section-label mt-1">
            {HEALTH_CARD_COPY.API_LABEL}{" "}
            <strong className="text-[#e2e8f0]">{statusLabel}</strong>
          </p>
        </div>
        <span className="ai-status-badge" data-level={resolveHealthLevel(health?.status)}>
          {statusLabel}
        </span>
      </div>
      {error ? <p className="text-[#fb7185] text-xs mt-3">{error}</p> : null}
      <p className="ai-section-label mt-3">{HEALTH_CARD_COPY.LAN_HINT}</p>
    </section>
  );
}
