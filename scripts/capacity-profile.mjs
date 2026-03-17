#!/usr/bin/env node
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

function getArg(name, fallback = null) {
    const idx = process.argv.indexOf(name);
    if (idx === -1) return fallback;
    return process.argv[idx + 1] ?? fallback;
}

function toInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toFloat(value, fallback) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 2) {
    if (!Number.isFinite(value)) return 0;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function percentile(values, ratio) {
    if (!values.length) return null;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
    return round(sorted[index]);
}

async function requestJson(url, { method = "GET", headers = {}, body, timeoutMs = 12000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = performance.now();
    try {
        const response = await fetch(url, {
            method,
            headers,
            body,
            signal: controller.signal,
        });
        const elapsedMs = performance.now() - startedAt;
        const text = await response.text();
        let json = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch {
            json = null;
        }
        return { response, text, json, elapsedMs: round(elapsedMs) };
    } finally {
        clearTimeout(timer);
    }
}

async function runLoad(endpoint, { iterations, concurrency }) {
    const results = [];
    let cursor = 0;
    const startedAt = performance.now();

    async function worker() {
        while (cursor < iterations) {
            const index = cursor;
            cursor += 1;
            results[index] = await endpoint.run();
        }
    }

    const workerCount = Math.max(1, Math.min(concurrency, iterations));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    const durationMs = performance.now() - startedAt;
    const successful = results.filter((item) => item.ok);
    const failed = results.filter((item) => !item.ok);
    const latencies = successful.map((item) => item.elapsedMs).filter(Number.isFinite);
    const throughputRps = durationMs > 0 ? round((results.length / durationMs) * 1000) : 0;
    const errorRate = results.length ? round((failed.length / results.length) * 100) : 0;

    return {
        durationMs: round(durationMs),
        requestCount: results.length,
        successCount: successful.length,
        errorCount: failed.length,
        errorRate,
        throughputRps,
        latencyMs: {
            p50: percentile(latencies, 0.5),
            p95: percentile(latencies, 0.95),
            p99: percentile(latencies, 0.99),
        },
        failures: failed.slice(0, 5).map((item) => item.error || "falha sem detalhe"),
    };
}

function evaluateBudget(summary, thresholds) {
    const reasons = [];
    if (summary.errorRate > thresholds.maxErrorRate) {
        reasons.push(`errorRate ${summary.errorRate}% > ${thresholds.maxErrorRate}%`);
    }
    if (summary.latencyMs.p95 !== null && summary.latencyMs.p95 > thresholds.maxP95Ms) {
        reasons.push(`p95 ${summary.latencyMs.p95}ms > ${thresholds.maxP95Ms}ms`);
    }
    if (summary.throughputRps < thresholds.minThroughputRps) {
        reasons.push(`throughput ${summary.throughputRps}rps < ${thresholds.minThroughputRps}rps`);
    }
    return {
        status: reasons.length ? "blocked" : "approved",
        reasons,
    };
}

function printUsage() {
    console.log(`Uso:
  node scripts/capacity-profile.mjs [opcoes]

Opcoes:
  --base-url <url>            URL base da API (padrao: http://localhost:3001)
  --actor <userId>            Usuario admin para chamadas protegidas
  --iterations <n>            Requisicoes por endpoint (padrao: 12)
  --concurrency <n>           Concorrencia por endpoint (padrao: 3)
  --timeout-ms <n>            Timeout por request em ms (padrao: 12000)
  --max-error-rate <pct>      Orcamento maximo de erro em percentual (padrao: 5)
  --max-p95-ms <ms>           Orcamento maximo de p95 em ms (padrao: 1500)
  --min-throughput-rps <n>    Throughput minimo por endpoint (padrao: 1)
  --output <path>             Caminho do relatorio JSON
  --help                      Exibe esta ajuda`);
}

async function run() {
    if (process.argv.includes("--help") || process.argv.includes("-h")) {
        printUsage();
        return;
    }
    const baseUrl = (getArg("--base-url", process.env.CAPACITY_BASE_URL || "http://localhost:3001") || "").replace(/\/$/, "");
    const actor = getArg("--actor", process.env.CAPACITY_ACTOR_USER_ID || "user-default");
    const iterations = toInt(getArg("--iterations", process.env.CAPACITY_ITERATIONS || "12"), 12);
    const concurrency = toInt(getArg("--concurrency", process.env.CAPACITY_CONCURRENCY || "3"), 3);
    const timeoutMs = toInt(getArg("--timeout-ms", process.env.CAPACITY_TIMEOUT_MS || "12000"), 12000);
    const maxErrorRate = toFloat(getArg("--max-error-rate", process.env.CAPACITY_MAX_ERROR_RATE || "5"), 5);
    const maxP95Ms = toInt(getArg("--max-p95-ms", process.env.CAPACITY_MAX_P95_MS || "1500"), 1500);
    const minThroughputRps = toFloat(getArg("--min-throughput-rps", process.env.CAPACITY_MIN_THROUGHPUT_RPS || "1"), 1);
    const outputPath = getArg("--output", path.join("server", "artifacts", "capacity", "capacity-report.json"));

    const thresholds = {
        maxErrorRate,
        maxP95Ms,
        minThroughputRps,
    };
    const startedAt = new Date().toISOString();

    const endpoints = [
        {
            name: "health",
            method: "GET",
            path: "/api/health",
            run: async () => {
                try {
                    const { response, json, text, elapsedMs } = await requestJson(`${baseUrl}/api/health`, {
                        timeoutMs,
                    });
                    const ok = response.status === 200 && typeof json?.status === "string";
                    return {
                        ok,
                        elapsedMs,
                        error: ok ? null : json?.error || text || `health HTTP ${response.status}`,
                    };
                } catch (error) {
                    return { ok: false, elapsedMs: null, error: String(error?.message || error) };
                }
            },
        },
        {
            name: "diagnostics",
            method: "GET",
            path: "/api/diagnostics/export",
            run: async () => {
                try {
                    const { response, json, text, elapsedMs } = await requestJson(`${baseUrl}/api/diagnostics/export`, {
                        timeoutMs,
                        headers: {
                            "x-user-id": actor,
                        },
                    });
                    const ok = response.status === 200 && !!json?.health && !!json?.slo;
                    return {
                        ok,
                        elapsedMs,
                        error: ok ? null : json?.error || text || `diagnostics HTTP ${response.status}`,
                    };
                } catch (error) {
                    return { ok: false, elapsedMs: null, error: String(error?.message || error) };
                }
            },
        },
        {
            name: "chat-flow",
            method: "POST",
            path: "/api/chat",
            run: async () => {
                try {
                    const { response, json, text, elapsedMs } = await requestJson(`${baseUrl}/api/chat`, {
                        method: "POST",
                        timeoutMs,
                        headers: {
                            "content-type": "application/json",
                            "x-user-id": actor,
                        },
                        body: JSON.stringify({
                            chatId: `capacity-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                            message: "Capacity profile check: responda apenas ok.",
                        }),
                    });
                    const ok = response.status === 200 && typeof json?.reply === "string" && json.reply.trim().length > 0;
                    return {
                        ok,
                        elapsedMs,
                        error: ok ? null : json?.error || text || `chat HTTP ${response.status}`,
                    };
                } catch (error) {
                    return { ok: false, elapsedMs: null, error: String(error?.message || error) };
                }
            },
        },
    ];

    const endpointReports = [];
    for (const endpoint of endpoints) {
        const summary = await runLoad(endpoint, { iterations, concurrency });
        endpointReports.push({
            name: endpoint.name,
            method: endpoint.method,
            path: endpoint.path,
            ...summary,
            budget: evaluateBudget(summary, thresholds),
        });
    }

    const totals = endpointReports.reduce(
        (acc, item) => {
            acc.requestCount += item.requestCount;
            acc.successCount += item.successCount;
            acc.errorCount += item.errorCount;
            acc.durationMs += item.durationMs;
            return acc;
        },
        { requestCount: 0, successCount: 0, errorCount: 0, durationMs: 0 },
    );

    totals.errorRate = totals.requestCount ? round((totals.errorCount / totals.requestCount) * 100) : 0;
    totals.throughputRps = totals.durationMs > 0 ? round((totals.requestCount / totals.durationMs) * 1000) : 0;

    const blockedEndpoints = endpointReports.filter((item) => item.budget.status === "blocked");
    const report = {
        generatedAt: new Date().toISOString(),
        startedAt,
        finishedAt: new Date().toISOString(),
        context: {
            baseUrl,
            actor,
            iterations,
            concurrency,
            timeoutMs,
        },
        thresholds,
        totals,
        budgets: {
            status: blockedEndpoints.length ? "blocked" : "approved",
            reasons: blockedEndpoints.flatMap((item) =>
                item.budget.reasons.map((reason) => `${item.name}: ${reason}`),
            ),
        },
        endpoints: endpointReports,
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");

    if (report.budgets.status === "approved") {
        console.log(`Perfil de capacidade aprovado. Relatorio: ${outputPath}`);
        return;
    }

    console.error(`Perfil de capacidade bloqueado. Relatorio: ${outputPath}`);
    for (const reason of report.budgets.reasons) {
        console.error(`- ${reason}`);
    }
    process.exitCode = 1;
}

run().catch((error) => {
    console.error("Falha ao executar perfil de capacidade:", error?.message || error);
    process.exit(1);
});
