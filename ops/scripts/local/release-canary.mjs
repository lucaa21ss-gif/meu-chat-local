#!/usr/bin/env node
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { buildApiRunbookSuggestions } from "./runbook-suggestions.mjs";

function getArg(name, fallback = null) {
    const idx = process.argv.indexOf(name);
    if (idx === -1) return fallback;
    return process.argv[idx + 1] ?? fallback;
}

function toInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

async function requestJson(url, { method = "GET", headers = {}, body, timeoutMs = 10000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            method,
            headers,
            body,
            signal: controller.signal,
        });
        const text = await response.text();
        let json = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch {
            json = null;
        }
        return { response, text, json };
    } finally {
        clearTimeout(timer);
    }
}

async function run() {
    const baseUrl = (getArg("--base-url", process.env.CANARY_BASE_URL || "http://localhost:4000") || "").replace(/\/$/, "");
    const actor = getArg("--actor", process.env.CANARY_ACTOR_USER_ID || "user-default");
    const timeoutMs = toInt(getArg("--timeout-ms", process.env.CANARY_TIMEOUT_MS || "12000"), 12000);
    const chatTimeoutMs = toInt(
        getArg("--chat-timeout-ms", process.env.CANARY_CHAT_TIMEOUT_MS || String(Math.max(timeoutMs, 25000))),
        Math.max(timeoutMs, 25000),
    );
    const outputPath = getArg("--output", path.join("artifacts", "canary", "canary-report.json"));

    const startedAt = new Date().toISOString();
    const checks = [];

    const healthCheck = { name: "health", ok: false, details: {} };
    try {
        const { response, json, text } = await requestJson(`${baseUrl}/api/health`, { timeoutMs });
        healthCheck.ok = response.status === 200 && json?.status === "healthy";
        healthCheck.details = {
            statusCode: response.status,
            reportedStatus: json?.status || null,
            alerts: Array.isArray(json?.alerts) ? json.alerts : [],
            error: healthCheck.ok ? null : json?.error || text || "health check falhou",
        };
    } catch (error) {
        healthCheck.details = {
            statusCode: null,
            reportedStatus: null,
            alerts: [],
            error: String(error?.message || error),
        };
    }
    checks.push(healthCheck);

    const diagnosticsCheck = { name: "diagnostics", ok: false, details: {} };
    try {
        const { response, json, text } = await requestJson(`${baseUrl}/api/diagnostics/export`, {
            timeoutMs,
            headers: {
                "x-user-id": actor,
            },
        });

        diagnosticsCheck.ok =
            response.status === 200 &&
            json &&
            typeof json === "object" &&
            !!json.health &&
            !!json.slo;

        diagnosticsCheck.details = {
            statusCode: response.status,
            hasHealth: !!json?.health,
            hasSlo: !!json?.slo,
            hasAutoHealing: !!json?.autoHealing,
            error: diagnosticsCheck.ok ? null : json?.error || text || "diagnostics check falhou",
        };
    } catch (error) {
        diagnosticsCheck.details = {
            statusCode: null,
            hasHealth: false,
            hasSlo: false,
            hasAutoHealing: false,
            error: String(error?.message || error),
        };
    }
    checks.push(diagnosticsCheck);

    const chatCheck = { name: "chat-flow", ok: false, details: {} };
    try {
        const { response, json, text } = await requestJson(`${baseUrl}/api/chat`, {
            method: "POST",
            timeoutMs: chatTimeoutMs,
            headers: {
                "content-type": "application/json",
                "x-user-id": actor,
            },
            body: JSON.stringify({
                chatId: "canary-release-gate",
                message: "Canary gate check: responda apenas ok.",
            }),
        });

        chatCheck.ok =
            response.status === 200 &&
            json &&
            typeof json.reply === "string" &&
            json.reply.trim().length > 0;

        chatCheck.details = {
            statusCode: response.status,
            hasReply: typeof json?.reply === "string" && json.reply.trim().length > 0,
            traceId: json?.traceId || null,
            error: chatCheck.ok ? null : json?.error || text || "chat flow check falhou",
        };
    } catch (error) {
        chatCheck.details = {
            statusCode: null,
            hasReply: false,
            traceId: null,
            error: String(error?.message || error),
        };
    }
    checks.push(chatCheck);

    const failedChecks = checks.filter((item) => !item.ok);
    const runbookSuggestions = buildApiRunbookSuggestions(checks);
    const report = {
        generatedAt: new Date().toISOString(),
        startedAt,
        finishedAt: new Date().toISOString(),
        gate: {
            status: failedChecks.length ? "blocked" : "approved",
            reasons: failedChecks.map((item) => `${item.name}: ${item.details.error || "falha"}`),
        },
        context: {
            baseUrl,
            actor,
            timeoutMs,
            chatTimeoutMs,
            checkCount: checks.length,
        },
        checks,
        runbookSuggestions,
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");

    if (report.gate.status === "approved") {
        console.log(`Canary aprovado. Relatorio: ${outputPath}`);
        return;
    }

    console.error(`Canary bloqueado. Relatorio: ${outputPath}`);
    for (const reason of report.gate.reasons) {
        console.error(`- ${reason}`);
    }
    if (report.runbookSuggestions.length) {
        console.error("Runbooks sugeridos:");
        for (const suggestion of report.runbookSuggestions) {
            console.error(`- ${suggestion.path}: ${suggestion.reason}`);
        }
    }
    process.exitCode = 1;
}

run().catch((error) => {
    console.error("Falha ao executar canary:", error?.message || error);
    process.exit(1);
});
