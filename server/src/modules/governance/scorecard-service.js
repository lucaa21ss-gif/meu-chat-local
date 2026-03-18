import path from "node:path";
import { mkdir as fsMkdir, writeFile as fsWriteFile } from "node:fs/promises";

export function createScorecardService({
  scorecardPath,
  now = () => new Date().toISOString(),
}) {
  function buildStatus(dimensions) {
    const statuses = dimensions.map((dimension) => dimension.status);
    if (statuses.some((status) => status === "critico")) return "critico";
    if (statuses.some((status) => status === "alerta")) return "alerta";
    return "ok";
  }

  function healthDimension(health) {
    const status = health?.status;
    return {
      name: "health",
      label: "Saude do sistema",
      status:
        status === "healthy"
          ? "ok"
          : status === "degraded"
            ? "alerta"
            : status === "unhealthy"
              ? "critico"
              : "ok",
      detail: { status, checks: health?.checks },
    };
  }

  function sloDimension(slo) {
    const status = slo?.status;
    return {
      name: "slo",
      label: "SLO de disponibilidade e latencia",
      status: status === "ok" ? "ok" : status === "alerta" ? "alerta" : "ok",
      detail: { status, evaluatedRoutes: slo?.evaluatedRoutes },
    };
  }

  function backupDimension(backupValidation) {
    const status = backupValidation?.status;
    return {
      name: "backup",
      label: "Validacao de backups recentes",
      status:
        status === "ok"
          ? "ok"
          : status === "alerta"
            ? "alerta"
            : status === "falha"
              ? "critico"
              : "ok",
      detail: { status, items: backupValidation?.items },
    };
  }

  function integrityDimension(integrity) {
    const status = integrity?.status;
    return {
      name: "integrity",
      label: "Integridade de artefatos criticos",
      status: status === "ok" ? "ok" : status === "failed" ? "critico" : "ok",
      detail: { status, mismatches: integrity?.mismatches?.length ?? 0 },
    };
  }

  function capacityDimension(capacity) {
    const status = capacity?.status;
    return {
      name: "capacity",
      label: "Orcamento de capacidade",
      status:
        status === "approved"
          ? "ok"
          : status === "alerta"
            ? "alerta"
            : status === "blocked"
              ? "critico"
              : "ok",
      detail: { status, totals: capacity?.totals },
    };
  }

  function autoHealingDimension(autoHealing) {
    const circuit = autoHealing?.circuit;
    const status =
      autoHealing?.enabled === false || circuit === "open" ? "alerta" : "ok";
    return {
      name: "auto-healing",
      label: "Auto-healing e recuperacao automatica",
      status,
      detail: { enabled: autoHealing?.enabled, circuit, attempts: autoHealing?.attemptCount },
    };
  }

  function incidentDimension(incident) {
    const status = incident?.status;
    return {
      name: "incident",
      label: "Status de incidente operacional",
      status:
        status === "normal"
          ? "ok"
          : status === "resolved"
            ? "ok"
            : status === "investigating" || status === "mitigating"
              ? "alerta"
              : "ok",
      detail: { status, severity: incident?.severity, summary: incident?.summary },
    };
  }

  function baselineDimension(baseline) {
    const status = baseline?.status;
    return {
      name: "baseline",
      label: "Drift de configuracao",
      status: status === "ok" ? "ok" : status === "drift" ? "alerta" : "ok",
      detail: { status, driftedKeys: baseline?.driftedKeys, checkedAt: baseline?.checkedAt },
    };
  }

  function pendingApprovalsDimension(pendingApprovals) {
    const count = pendingApprovals ?? 0;
    return {
      name: "approvals",
      label: "Aprovacoes operacionais pendentes",
      status: count > 0 ? "alerta" : "ok",
      detail: { pendingCount: count },
    };
  }

  function queueDimension(queue) {
    const saturated =
      queue &&
      (queue.rejectedCount > 0 ||
        queue.queuedCount + queue.activeCount > queue.maxConcurrency * 2);
    return {
      name: "queue",
      label: "Fila de operacoes",
      status: saturated ? "alerta" : "ok",
      detail: {
        activeCount: queue?.activeCount,
        queuedCount: queue?.queuedCount,
        rejectedCount: queue?.rejectedCount,
      },
    };
  }

  function buildRecommendations(dimensions) {
    const recommendations = [];
    for (const dimension of dimensions) {
      if (dimension.status === "critico") {
        recommendations.push({
          dimension: dimension.name,
          severity: "critical",
          action: `Dimensao ${dimension.label} em estado critico — intervencao imediata necessaria`,
        });
      } else if (dimension.status === "alerta") {
        recommendations.push({
          dimension: dimension.name,
          severity: "medium",
          action: `Dimensao ${dimension.label} em alerta — revisar e planejar correcao`,
        });
      }
    }
    if (!recommendations.length) {
      recommendations.push({
        dimension: "all",
        severity: "info",
        action: "Todos os indicadores operacionais estao saudaveis",
      });
    }
    return recommendations;
  }

  async function generate({
    health,
    slo,
    backupValidation,
    integrity,
    capacity,
    autoHealing,
    incident,
    baseline,
    pendingApprovals,
    queue,
  }) {
    const dimensions = [
      healthDimension(health),
      sloDimension(slo),
      backupDimension(backupValidation),
      integrityDimension(integrity),
      capacityDimension(capacity),
      autoHealingDimension(autoHealing),
      incidentDimension(incident),
      baselineDimension(baseline),
      pendingApprovalsDimension(pendingApprovals),
      queueDimension(queue),
    ];

    const status = buildStatus(dimensions);
    const recommendations = buildRecommendations(dimensions);
    const generatedAt = now();

    const scorecard = {
      version: 1,
      generatedAt,
      status,
      dimensions,
      recommendations,
    };

    await fsMkdir(path.dirname(scorecardPath), { recursive: true });
    await fsWriteFile(scorecardPath, JSON.stringify(scorecard, null, 2), "utf-8");

    return scorecard;
  }

  return { generate };
}
