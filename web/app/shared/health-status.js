export function createHealthStatusController({
  state,
  fetchJson,
  buildHeaderPresentation,
  ollamaStatusBadgeEl,
  systemHealthBadgeEl,
  ollamaLatencyTextEl,
  healthSummaryTextEl,
  healthChecksTextEl,
  healthSloTextEl,
}) {
  async function checkHealth() {
    const startedAt = performance.now();
    let requestOk = false;

    try {
      const data = await fetchJson("/api/health");
      requestOk = true;
      state.ollamaStatus = data.ollama === "online" ? "online" : "offline";
      state.health = {
        status: data.status || "unknown",
        checks: data.checks || {
          db: { status: "unknown" },
          model: { status: "unknown" },
          disk: { status: "unknown" },
        },
        slo: data.slo || { status: "insuficiente", evaluatedRoutes: [] },
        rateLimiter: data.rateLimiter || null,
        alerts: Array.isArray(data.alerts) ? data.alerts : [],
      };
    } catch {
      state.ollamaStatus = "offline";
      state.health = {
        status: "unhealthy",
        checks: {
          db: { status: "unknown" },
          model: { status: "unhealthy" },
          disk: { status: "unknown" },
        },
        slo: { status: "insuficiente", evaluatedRoutes: [] },
        alerts: ["Falha ao consultar endpoint de health"],
      };
    }

    const latencyMs = performance.now() - startedAt;
    state.healthLatencyMs = Number.isFinite(latencyMs) ? Math.max(0, latencyMs) : null;
    state.health = {
      ...state.health,
      latencyMs: state.healthLatencyMs,
      lastCheckedAt: new Date().toISOString(),
    };

    if (ollamaStatusBadgeEl) {
      if (state.ollamaStatus === "online") {
        ollamaStatusBadgeEl.className =
          "inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500";
        ollamaStatusBadgeEl.title = "Ollama conectado";
      } else {
        ollamaStatusBadgeEl.className =
          "inline-block h-2 w-2 shrink-0 rounded-full bg-red-500";
        ollamaStatusBadgeEl.title = "Ollama offline";
      }
    }

    const headerView = buildHeaderPresentation(state.health);
    if (systemHealthBadgeEl) {
      systemHealthBadgeEl.textContent = headerView.badgeText;
      systemHealthBadgeEl.className = headerView.badgeClassName;
      systemHealthBadgeEl.title = headerView.badgeTitle;
    }
    if (ollamaLatencyTextEl) {
      ollamaLatencyTextEl.textContent = headerView.latencyText;
      ollamaLatencyTextEl.className = `text-[11px] ${headerView.latencyClassName}`;
    }

    if (healthSummaryTextEl) {
      const labels = {
        healthy: "Saudavel",
        degraded: "Degradado",
        unhealthy: "Critico",
        unknown: "Desconhecido",
      };
      healthSummaryTextEl.textContent = `Status: ${labels[state.health.status] || "Desconhecido"}`;
    }

    if (healthChecksTextEl) {
      const dbStatus = state.health?.checks?.db?.status || "unknown";
      const modelStatus = state.health?.checks?.model?.status || "unknown";
      const diskStatus = state.health?.checks?.disk?.status || "unknown";
      const lines = [
        `DB: ${dbStatus}`,
        `Modelo: ${modelStatus}`,
        `Disco: ${diskStatus}`,
      ];
      const rl = state.health?.rateLimiter;
      if (rl) {
        lines.push(
          `Fila: ${rl.currentQueueSize}/${rl.queueMax} | Enfileiradas: ${rl.queuedTotal} | Rejeitadas: ${rl.rejectedTotal}`,
        );
      }
      const alerts = (state.health.alerts || []).slice(0, 2);
      if (alerts.length) {
        lines.push(`Alerta: ${alerts.join(" | ")}`);
      }
      healthChecksTextEl.textContent = lines.join(" • ");
    }

    if (healthSloTextEl) {
      const sloStatus = state.health?.slo?.status || "insuficiente";
      const labels = {
        ok: "OK",
        alerta: "ALERTA",
        insuficiente: "SEM AMOSTRAS",
      };
      const evaluatedRoutes = Array.isArray(state.health?.slo?.evaluatedRoutes)
        ? state.health.slo.evaluatedRoutes.filter((item) => item.status !== "insuficiente")
        : [];
      const details = evaluatedRoutes
        .slice(0, 2)
        .map((item) => `${item.route} p95=${item.p95Ms}ms err=${item.errorRate}%`)
        .join(" | ");

      healthSloTextEl.textContent = details
        ? `SLO: ${labels[sloStatus] || "SEM AMOSTRAS"} • ${details}`
        : `SLO: ${labels[sloStatus] || "SEM AMOSTRAS"}`;
    }

    return requestOk;
  }

  return {
    checkHealth,
  };
}
