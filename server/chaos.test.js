import test, { after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import request from "supertest";
import { createApp } from "./index.js";
import {
    setEnabled as setTelemetryEnabled,
    resetStats as resetTelemetryStats,
} from "./src/infra/telemetry/telemetry.js";

function createChaosStore() {
    const users = new Map([
        [
            "user-default",
            {
                id: "user-default",
                role: "admin",
                theme: "system",
                storageLimitMb: 512,
            },
        ],
        [
            "user-operator",
            {
                id: "user-operator",
                role: "operator",
                theme: "system",
                storageLimitMb: 512,
            },
        ],
        [
            "user-viewer",
            {
                id: "user-viewer",
                role: "viewer",
                theme: "system",
                storageLimitMb: 512,
            },
        ],
    ]);

    return {
        getUserById: async (userId) => users.get(userId) || null,
        listAuditLogs: async () => ({ items: [], page: 1, limit: 50, total: 0 }),
        listConfigVersions: async () => ({ items: [], page: 1, limit: 50, total: 0 }),
        appendAuditLog: async () => ({ ok: true }),
        appendConfigVersion: async () => ({ ok: true }),
    };
}

function buildDeps(healthProviders) {
    return {
        ...createChaosStore(),
        healthProviders,
        storageService: {
            getUsage: async () => ({
                dbBytes: 100,
                uploadsBytes: 200,
                documentsBytes: 300,
                backupsBytes: 400,
                totalBytes: 1000,
            }),
            cleanup: async () => ({
                mode: "dry-run",
                files: [],
                filesCount: 0,
                estimatedFreedBytes: 0,
            }),
        },
        backupService: {
            createBackup: async () => ({
                fileName: "chaos.tgz",
                archiveBuffer: Buffer.from("chaos"),
                contentType: "application/gzip",
                isEncrypted: false,
            }),
            restoreBackup: async () => ({ restored: true }),
            validateRecentBackups: async () => ({
                checkedAt: new Date().toISOString(),
                status: "ok",
                limit: 3,
                items: [],
            }),
        },
        chatClient: {
            chat: async () => ({ message: { content: "ok" } }),
        },
    };
}

const scenarioResults = [];

async function runScenario(name, runner) {
    const startedAt = new Date().toISOString();
    try {
        const evidence = await runner();
        scenarioResults.push({
            name,
            status: "passed",
            startedAt,
            finishedAt: new Date().toISOString(),
            evidence,
        });
    } catch (error) {
        scenarioResults.push({
            name,
            status: "failed",
            startedAt,
            finishedAt: new Date().toISOString(),
            error: String(error?.message || error),
        });
        throw error;
    }
}

after(async () => {
    const artifactsDir = path.join(process.cwd(), "artifacts", "chaos");
    await fs.mkdir(artifactsDir, { recursive: true });

    const report = {
        generatedAt: new Date().toISOString(),
        suite: "chaos-local-v1",
        totals: {
            scenarios: scenarioResults.length,
            passed: scenarioResults.filter((item) => item.status === "passed").length,
            failed: scenarioResults.filter((item) => item.status === "failed").length,
        },
        scenarios: scenarioResults,
    };

    await fs.writeFile(
        path.join(artifactsDir, "chaos-report.json"),
        JSON.stringify(report, null, 2),
        "utf8",
    );

    setTelemetryEnabled(false);
    resetTelemetryStats();
});

test("chaos: disco cheio impacta health e diagnostics", async () => {
    await runScenario("disk-full", async () => {
        resetTelemetryStats();
        setTelemetryEnabled(false);

        const app = createApp(
            buildDeps({
                checkDb: async () => ({ status: "healthy", latencyMs: 2 }),
                checkModel: async () => ({ status: "healthy", latencyMs: 3, ollama: "online" }),
                checkDisk: async () => ({
                    status: "unhealthy",
                    latencyMs: 4,
                    freePercent: 0,
                    error: "disk full",
                }),
            }),
        );

        const healthRes = await request(app).get("/api/health").expect(200);
        assert.equal(healthRes.body.status, "unhealthy");
        assert.equal(healthRes.body.checks.disk.status, "unhealthy");

        const diagnosticsRes = await request(app)
            .get("/api/diagnostics/export")
            .set("x-user-id", "user-default")
            .expect(200);

        const payload = JSON.parse(diagnosticsRes.text);
        assert.equal(payload.health.checks.disk.status, "unhealthy");
        assert.equal(Array.isArray(payload.triageChecklist.recommendations), true);

        return {
            healthStatus: healthRes.body.status,
            diskStatus: payload.health.checks.disk.status,
            recommendations: payload.triageChecklist.recommendations,
        };
    });
});

test("chaos: modelo indisponivel gera alerta em SLO e evidencia no diagnostics", async () => {
    await runScenario("model-offline", async () => {
        resetTelemetryStats();
        setTelemetryEnabled(true);

        const app = createApp(
            buildDeps({
                checkDb: async () => ({ status: "healthy", latencyMs: 2 }),
                checkModel: async () => ({
                    status: "degraded",
                    latencyMs: 10,
                    ollama: "offline",
                    error: "connection refused",
                }),
                checkDisk: async () => ({ status: "healthy", latencyMs: 3, freePercent: 70 }),
            }),
        );

        for (let i = 0; i < 5; i += 1) {
            await request(app)
                .post("/api/chat")
                .send({ chatId: "default", message: "" })
                .expect(400);
        }

        const sloRes = await request(app)
            .get("/api/slo")
            .set("x-user-id", "user-operator")
            .expect(200);

        assert.equal(sloRes.body.status, "alerta");

        const diagnosticsRes = await request(app)
            .get("/api/diagnostics/export")
            .set("x-user-id", "user-default")
            .expect(200);

        const payload = JSON.parse(diagnosticsRes.text);
        const hasSloRecommendation = payload.triageChecklist.recommendations.some(
            (item) => item.type === "slo",
        );

        assert.equal(payload.health.checks.model.status, "degraded");
        assert.equal(hasSloRecommendation, true);

        return {
            sloStatus: sloRes.body.status,
            modelHealth: payload.health.checks.model.status,
            recommendations: payload.triageChecklist.recommendations,
        };
    });
});

test("chaos: DB degradado e recuperacao refletidos em health", async () => {
    await runScenario("db-degraded-recovery", async () => {
        resetTelemetryStats();
        setTelemetryEnabled(false);

        const degradedApp = createApp(
            buildDeps({
                checkDb: async () => ({ status: "unhealthy", latencyMs: 40, error: "database is locked" }),
                checkModel: async () => ({ status: "healthy", latencyMs: 2, ollama: "online" }),
                checkDisk: async () => ({ status: "healthy", latencyMs: 2, freePercent: 60 }),
            }),
        );

        const unhealthyRes = await request(degradedApp).get("/api/health").expect(200);
        assert.equal(unhealthyRes.body.status, "unhealthy");

        const recoveredApp = createApp(
            buildDeps({
                checkDb: async () => ({ status: "healthy", latencyMs: 3 }),
                checkModel: async () => ({ status: "healthy", latencyMs: 2, ollama: "online" }),
                checkDisk: async () => ({ status: "healthy", latencyMs: 2, freePercent: 60 }),
            }),
        );

        const healthyRes = await request(recoveredApp).get("/api/health").expect(200);
        assert.equal(healthyRes.body.status, "healthy");

        return {
            before: unhealthyRes.body.status,
            after: healthyRes.body.status,
        };
    });
});
