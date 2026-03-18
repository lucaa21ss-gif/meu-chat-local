import path from "node:path";
import {
  readFile as fsReadFile,
  readdir as fsReaddir,
  stat as fsStat,
} from "node:fs/promises";

function buildCapacityEmptySummary(reason = "capacity-report-missing") {
  return {
    status: "unknown",
    reason,
    generatedAt: null,
    reportPath: null,
    thresholds: null,
    totals: {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      errorRate: 0,
      throughputRps: 0,
    },
    endpoints: [],
  };
}

export function createCapacityProfileService({
  baseDir,
  artifactsDir,
  reportFileName = "capacity-report.json",
} = {}) {
  async function resolveLatestReportPath() {
    const preferredPath = path.join(artifactsDir, reportFileName);
    try {
      await fsStat(preferredPath);
      return preferredPath;
    } catch {
      // Fallback para o arquivo mais recente caso o nome padrao mude.
    }

    let entries = [];
    try {
      entries = await fsReaddir(artifactsDir, { withFileTypes: true });
    } catch {
      return null;
    }

    const candidates = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => {
          const fullPath = path.join(artifactsDir, entry.name);
          const stats = await fsStat(fullPath);
          return {
            fullPath,
            mtimeMs: stats.mtimeMs,
          };
        }),
    );

    if (!candidates.length) {
      return null;
    }
    candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
    return candidates[0].fullPath;
  }

  function summarizeEndpoint(endpoint = {}) {
    return {
      name: endpoint.name || "unknown",
      method: endpoint.method || "GET",
      path: endpoint.path || null,
      requestCount: Number(endpoint.requestCount || 0),
      successCount: Number(endpoint.successCount || 0),
      errorCount: Number(endpoint.errorCount || 0),
      errorRate: typeof endpoint.errorRate === "number" ? endpoint.errorRate : 0,
      throughputRps:
        typeof endpoint.throughputRps === "number" ? endpoint.throughputRps : 0,
      latencyMs: {
        p50:
          typeof endpoint.latencyMs?.p50 === "number" ? endpoint.latencyMs.p50 : null,
        p95:
          typeof endpoint.latencyMs?.p95 === "number" ? endpoint.latencyMs.p95 : null,
        p99:
          typeof endpoint.latencyMs?.p99 === "number" ? endpoint.latencyMs.p99 : null,
      },
      budget: {
        status: endpoint.budget?.status || "unknown",
        reasons: Array.isArray(endpoint.budget?.reasons)
          ? endpoint.budget.reasons
          : [],
      },
    };
  }

  function summarizeReport(report, reportPath) {
    const endpoints = Array.isArray(report?.endpoints)
      ? report.endpoints.map((endpoint) => summarizeEndpoint(endpoint))
      : [];

    return {
      status: report?.budgets?.status || report?.status || "unknown",
      reason:
        Array.isArray(report?.budgets?.reasons) && report.budgets.reasons.length
          ? report.budgets.reasons.join("; ")
          : endpoints.some((item) => item.budget.status === "blocked")
            ? "capacity-budget-violated"
            : "capacity-report-ready",
      generatedAt: report?.generatedAt || null,
      reportPath: reportPath ? path.relative(baseDir, reportPath) : null,
      thresholds: report?.thresholds || null,
      totals: {
        requestCount: Number(report?.totals?.requestCount || 0),
        successCount: Number(report?.totals?.successCount || 0),
        errorCount: Number(report?.totals?.errorCount || 0),
        errorRate:
          typeof report?.totals?.errorRate === "number" ? report.totals.errorRate : 0,
        throughputRps:
          typeof report?.totals?.throughputRps === "number"
            ? report.totals.throughputRps
            : 0,
      },
      endpoints,
    };
  }

  async function getLatestSummary() {
    const reportPath = await resolveLatestReportPath();
    if (!reportPath) {
      return buildCapacityEmptySummary();
    }

    try {
      const content = await fsReadFile(reportPath, "utf8");
      const report = JSON.parse(content);
      return summarizeReport(report, reportPath);
    } catch {
      return buildCapacityEmptySummary("capacity-report-unreadable");
    }
  }

  return {
    getLatestSummary,
  };
}
