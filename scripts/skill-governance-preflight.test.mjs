import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const scriptPath = path.resolve("scripts/skill-governance-preflight.mjs");

function makeTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "skill-governance-preflight-"));
}

test("preflight dry-run returns planned default steps in json", () => {
  const root = makeTempWorkspace();
  const result = spawnSync(process.execPath, [scriptPath, "--dry-run", "--json"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.dryRun, true);
  assert.equal(payload.success, true);
  assert.equal(payload.confidenceProfile, "local");
  assert.deepEqual(payload.selectedStepNames, [
    "validator-tests",
    "schema-note-tests",
    "enforcement-status-tests",
    "strict-validator",
  ]);
  assert.equal(payload.results.length, 4);
  assert.equal(payload.results.every((step) => step.dryRun === true), true);
});

test("preflight dry-run supports --only filter", () => {
  const root = makeTempWorkspace();
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--dry-run", "--json", "--only", "validator-tests,strict-validator"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  assert.deepEqual(payload.selectedStepNames, ["validator-tests", "strict-validator"]);
});

test("preflight fails on invalid --only entry", () => {
  const root = makeTempWorkspace();
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--dry-run", "--only", "validator-tests,nao-existe"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Etapas invalidas em --only/);
});

test("preflight fails on invalid --confidence-profile value", () => {
  const root = makeTempWorkspace();
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--dry-run", "--confidence-profile", "staging"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Perfil invalido em --confidence-profile/);
});

test("preflight supports ci confidence profile in dry-run", () => {
  const root = makeTempWorkspace();
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--dry-run", "--json", "--confidence-profile", "ci"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.confidenceProfile, "ci");
  assert.equal(payload.statusSummary.confidence, 70);
});

test("preflight defaults confidence profile to ci when CI=true", () => {
  const root = makeTempWorkspace();
  const result = spawnSync(process.execPath, [scriptPath, "--dry-run", "--json"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "true",
    },
  });

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.confidenceProfile, "ci");
  assert.equal(payload.statusSummary.confidence, 70);
});

test("preflight explicit confidence profile overrides CI default", () => {
  const root = makeTempWorkspace();
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--dry-run", "--json", "--confidence-profile", "local"],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        CI: "true",
      },
    },
  );

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.confidenceProfile, "local");
  assert.equal(payload.statusSummary.confidence, 80);
});

test("preflight writes markdown report to file", () => {
  const root = makeTempWorkspace();
  const output = "artifacts/skill-governance-preflight.md";
  const result = spawnSync(process.execPath, [scriptPath, "--dry-run", "--output", output], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

  const outputPath = path.join(root, output);
  assert.equal(fs.existsSync(outputPath), true);

  const content = fs.readFileSync(outputPath, "utf8");
  assert.match(content, /Skill Governance Preflight/);
  assert.match(content, /dryRun: yes/);
});

test("preflight fails when output path is a directory", () => {
  const root = makeTempWorkspace();
  const outputDir = path.join(root, "artifacts", "preflight-dir");
  fs.mkdirSync(outputDir, { recursive: true });

  const result = spawnSync(
    process.execPath,
    [scriptPath, "--dry-run", "--output", "artifacts/preflight-dir"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Falha ao escrever output/);
});

test("preflight dry-run strict-io reports successful ioCheck in json", () => {
  const root = makeTempWorkspace();
  const result = spawnSync(process.execPath, [scriptPath, "--dry-run", "--strict-io", "--json"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.strictIo, true);
  assert.equal(payload.ioCheck.enabled, true);
  assert.equal(payload.ioCheck.ok, true);
});

test("preflight strict-io fails when artifacts-dir points to file", () => {
  const root = makeTempWorkspace();
  const artifactsFile = path.join(root, "artifacts-file");
  fs.writeFileSync(artifactsFile, "x", "utf8");

  const result = spawnSync(
    process.execPath,
    [scriptPath, "--dry-run", "--strict-io", "--artifacts-dir", "artifacts-file"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Falha no preflight de I\/O/);
});

test("preflight includes execution context metadata from CI environment", () => {
  const root = makeTempWorkspace();
  const result = spawnSync(process.execPath, [scriptPath, "--dry-run", "--json"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "true",
      GITHUB_SHA: "abc123",
      GITHUB_REF: "refs/heads/main",
      GITHUB_EVENT_NAME: "push",
      GITHUB_RUN_ID: "999",
    },
  });

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.executionContext.ci, true);
  assert.equal(payload.executionContext.provider, "github");
  assert.equal(payload.executionContext.github.sha, "abc123");
  assert.equal(payload.executionContext.github.ref, "refs/heads/main");
  assert.equal(payload.executionContext.github.eventName, "push");
  assert.equal(payload.executionContext.github.runId, "999");
});

test("preflight markdown report includes execution context section in CI", () => {
  const root = makeTempWorkspace();
  const output = "artifacts/preflight-inspect.md";
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--dry-run", "--strict-io", "--output", output],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        CI: "true",
        GITHUB_SHA: "def456",
        GITHUB_REF: "refs/pull/10/merge",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_RUN_ID: "12345",
      },
    },
  );

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const outputPath = path.join(root, output);
  const content = fs.readFileSync(outputPath, "utf8");

  assert.match(content, /## Execution context/);
  assert.match(content, /github.sha: def456/);
  assert.match(content, /github.ref: refs\/pull\/10\/merge/);
  assert.match(content, /github.eventName: pull_request/);
  assert.match(content, /github.runId: 12345/);
});

test("preflight markdown report includes READY summary in dry-run", () => {
  const root = makeTempWorkspace();
  const output = "artifacts/preflight-summary.md";
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--dry-run", "--strict-io", "--output", output],
    {
      cwd: root,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const content = fs.readFileSync(path.join(root, output), "utf8");
  assert.match(content, /## Summary/);
  assert.match(content, /status: \[READY\] READY/);
  assert.match(content, /confidence: 80/);
  assert.match(content, /nextAction: Execute sem --dry-run/);
});

test("preflight report marks BLOCKED when a step fails", () => {
  const root = makeTempWorkspace();
  const output = "artifacts/preflight-failed.json";
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--json", "--output", output],
    {
      cwd: root,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const payload = JSON.parse(fs.readFileSync(path.join(root, output), "utf8"));
  assert.equal(payload.success, false);
  assert.equal(payload.statusSummary.status, "BLOCKED");
  assert.equal(payload.statusSummary.confidence, 35);
  assert.match(payload.statusSummary.reason, /Etapa falhou/);
  assert.match(payload.statusSummary.nextAction, /npm run/);
});

test("preflight markdown report includes BLOCKED tag when a step fails", () => {
  const root = makeTempWorkspace();
  const output = "artifacts/preflight-failed.md";
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--output", output],
    {
      cwd: root,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const content = fs.readFileSync(path.join(root, output), "utf8");
  assert.match(content, /status: \[BLOCKED\] BLOCKED/);
  assert.match(content, /confidence: 35/);
  assert.match(content, /nextAction: Execute manualmente: npm run/);
});