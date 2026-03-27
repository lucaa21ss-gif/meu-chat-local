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