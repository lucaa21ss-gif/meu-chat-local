import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const scriptPath = path.resolve("scripts/skill-schema-enforcement-status.mjs");

function makeTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "skill-schema-enforcement-"));
}

test("status script reports enabled when variable is true", () => {
  const root = makeTempWorkspace();
  const result = spawnSync(process.execPath, [scriptPath, "--json"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      SKILL_SCHEMA_CONTRACT_ENFORCE: "true",
    },
  });

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.variable, "SKILL_SCHEMA_CONTRACT_ENFORCE");
  assert.equal(payload.enabled, true);
});

test("status script reports disabled when variable is unset", () => {
  const root = makeTempWorkspace();
  const env = { ...process.env };
  delete env.SKILL_SCHEMA_CONTRACT_ENFORCE;

  const result = spawnSync(process.execPath, [scriptPath, "--json"], {
    cwd: root,
    encoding: "utf8",
    env,
  });

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.rawValue, null);
  assert.equal(payload.enabled, false);
});

test("status script writes markdown report to output file", () => {
  const root = makeTempWorkspace();
  const output = "artifacts/enforcement-status.md";
  const result = spawnSync(process.execPath, [scriptPath, "--output", output], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      SKILL_SCHEMA_CONTRACT_ENFORCE: "1",
    },
  });

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

  const outputPath = path.join(root, output);
  assert.equal(fs.existsSync(outputPath), true);
  const content = fs.readFileSync(outputPath, "utf8");
  assert.match(content, /enabled: yes/);
  assert.match(content, /Skill Schema Contract Enforcement Status/);
});