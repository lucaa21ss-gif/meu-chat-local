import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

function createMockServer(handlers) {
  const server = http.createServer((req, res) => {
    const key = `${req.method} ${req.url}`;
    const handler = handlers[key];

    if (!handler) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not-found" }));
      return;
    }

    handler(req, res);
  });

  return {
    async start() {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      return `http://127.0.0.1:${address.port}`;
    },
    async stop() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

async function runCanaryCli({ baseUrl, outputPath, timeoutMs = 2000, chatTimeoutMs = 2000 }) {
  const args = [
    "ops/scripts/local/release-canary.mjs",
    "--base-url",
    baseUrl,
    "--output",
    outputPath,
    "--timeout-ms",
    String(timeoutMs),
    "--chat-timeout-ms",
    String(chatTimeoutMs),
    "--actor",
    "user-default",
  ];

  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

test("release-canary aprova quando checks essenciais passam", async () => {
  const server = createMockServer({
    "GET /api/health": (_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "healthy", alerts: [] }));
    },
    "GET /api/diagnostics/export": (_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ health: { status: "healthy" }, slo: { status: "ok" }, autoHealing: {} }));
    },
    "POST /api/chat": (_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ reply: "ok", traceId: "trace-canary-approved" }));
    },
  });

  const baseUrl = await server.start();
  const tempDir = await mkdtemp(path.join(tmpdir(), "canary-test-approved-"));
  const outputPath = path.join(tempDir, "canary-report.json");

  try {
    const result = await runCanaryCli({ baseUrl, outputPath });
    assert.equal(result.code, 0);

    const report = JSON.parse(await readFile(outputPath, "utf8"));
    assert.equal(report.gate.status, "approved");
    assert.equal(report.checks.length, 3);
    assert.equal(report.context.chatTimeoutMs, 2000);
    assert.ok(Array.isArray(report.runbookSuggestions));
    assert.ok(
      report.runbookSuggestions.some((item) => item.path === "docs/runbooks/README.md"),
    );
  } finally {
    await server.stop();
  }
});

test("release-canary bloqueia e sugere runbook de disco quando health vem degraded", async () => {
  const server = createMockServer({
    "GET /api/health": (_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "degraded", alerts: ["Espaco em disco baixo"] }));
    },
    "GET /api/diagnostics/export": (_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ health: { status: "degraded" }, slo: { status: "ok" }, autoHealing: {} }));
    },
    "POST /api/chat": (_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ reply: "ok", traceId: "trace-canary-disk" }));
    },
  });

  const baseUrl = await server.start();
  const tempDir = await mkdtemp(path.join(tmpdir(), "canary-test-blocked-"));
  const outputPath = path.join(tempDir, "canary-report.json");

  try {
    const result = await runCanaryCli({ baseUrl, outputPath });
    assert.equal(result.code, 1);

    const report = JSON.parse(await readFile(outputPath, "utf8"));
    assert.equal(report.gate.status, "blocked");
    assert.ok(report.gate.reasons.some((reason) => reason.startsWith("health:")));
    assert.ok(
      report.runbookSuggestions.some((item) => item.path === "docs/runbooks/incident-disk-pressure.md"),
    );
    assert.ok(
      report.runbookSuggestions.some((item) => item.path === "docs/runbooks/README.md"),
    );
  } finally {
    await server.stop();
  }
});
