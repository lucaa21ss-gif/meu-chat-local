import { HEALTH_STATUS } from "../../shared/app-constants.js";

export function buildTriageRecommendations({
  health,
  slo,
  backupValidation,
  rateLimiter,
  recentErrors,
  incidentStatus,
}) {
  const recommendations = [];

  if (health?.status && health.status !== HEALTH_STATUS.HEALTHY) {
    recommendations.push({
      type: "health",
      severity: "high",
      action: "Priorize checks degradados/unhealthy e estabilize DB/model/disk antes de novas mudancas",
    });
  }

  if (slo?.status === "alerta") {
    recommendations.push({
      type: "slo",
      severity: "medium",
      action: "Investigue rotas em alerta no SLO e compare p95/erro com janelas anteriores",
    });
  }

  if (backupValidation?.status && backupValidation.status !== "ok") {
    recommendations.push({
      type: "backup",
      severity: backupValidation.status === "falha" ? "critical" : "medium",
      action: "Execute validacao com passphrase quando necessario e regenere backups invalidos",
    });
  }

  if (Number(rateLimiter?.rejectedTotal || 0) > 0) {
    recommendations.push({
      type: "rate-limiter",
      severity: "medium",
      action: "Analise picos de rejeicao/timeout no rate limiter e ajuste limites por papel se necessario",
    });
  }

  if (Array.isArray(recentErrors) && recentErrors.length >= 5) {
    recommendations.push({
      type: "security",
      severity: "high",
      action: "Volume alto de erros/bloqueios recentes; revisar possivel abuso ou regressao operacional",
    });
  }

  if (incidentStatus?.status && incidentStatus.status !== "normal") {
    recommendations.push({
      type: "manual",
      severity: incidentStatus.severity || "medium",
      action: `Incidente em ${incidentStatus.status}; manter atualizacao em ${incidentStatus.nextUpdateAt || "janela curta"} e registrar decisoes no runbook`,
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      type: "manual",
      severity: "info",
      action: "Sem sinais criticos no snapshot atual; manter monitoramento rotineiro",
    });
  }

  return recommendations;
}

export function buildOverallHealthStatus(checks = {}) {
  const statuses = Object.values(checks).map((item) => item?.status);
  if (statuses.some((status) => status === HEALTH_STATUS.UNHEALTHY)) {
    return HEALTH_STATUS.UNHEALTHY;
  }
  if (statuses.some((status) => status === HEALTH_STATUS.DEGRADED)) {
    return HEALTH_STATUS.DEGRADED;
  }
  return HEALTH_STATUS.HEALTHY;
}

export function buildSloSnapshot(telemetryStats = []) {
  const objectives = {
    availabilityMaxErrorRatePct: 5,
    p95LatencyReadMs: 400,
    p95LatencyWriteMs: 1200,
    minSamples: 5,
  };

  const criticalRoutes = telemetryStats.filter((item) => {
    const key = `${item.method} ${item.path}`;
    return [
      "GET /api/chats",
      "POST /api/chat",
      "POST /api/chat-stream",
      "GET /api/health",
    ].includes(key);
  });

  const evaluations = criticalRoutes.map((route) => {
    const isRead = route.method === "GET";
    const latencyTarget = isRead
      ? objectives.p95LatencyReadMs
      : objectives.p95LatencyWriteMs;
    const hasSamples = route.count >= objectives.minSamples;
    const availabilityOk = hasSamples
      ? (route.errorRate || 0) <= objectives.availabilityMaxErrorRatePct
      : true;
    const latencyOk = hasSamples ? (route.p95Ms || 0) <= latencyTarget : true;
    const status = hasSamples
      ? availabilityOk && latencyOk
        ? "ok"
        : "alerta"
      : "insuficiente";

    return {
      route: `${route.method} ${route.path}`,
      count: route.count || 0,
      errorRate: route.errorRate || 0,
      p95Ms: route.p95Ms || 0,
      target: {
        errorRate: objectives.availabilityMaxErrorRatePct,
        p95Ms: latencyTarget,
      },
      status,
    };
  });

  const considered = evaluations.filter((item) => item.status !== "insuficiente");
  const allOk = considered.length > 0 && considered.every((item) => item.status === "ok");
  const hasAlerts = considered.some((item) => item.status === "alerta");

  return {
    generatedAt: new Date().toISOString(),
    objectives,
    status: allOk ? "ok" : hasAlerts ? "alerta" : "insuficiente",
    evaluatedRoutes: evaluations,
  };
}
