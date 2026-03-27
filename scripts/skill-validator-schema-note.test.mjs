import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const scriptPath = path.resolve("scripts/skill-validator-schema-note.mjs");

function makeTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "skill-schema-note-"));
}

test("schema note marks changed when versions differ", () => {
  const root = makeTempWorkspace();
  const output = "artifacts/schema-note.md";

  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--output",
      output,
      "--previous-version",
      "1",
      "--current-version",
      "2",
      "--base-ref",
      "a",
      "--head-ref",
      "b",
    ],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

  const outPath = path.join(root, output);
  assert.equal(fs.existsSync(outPath), true);
  const content = fs.readFileSync(outPath, "utf8");

  assert.match(content, /changed: yes/);
  assert.match(content, /Atualizar docs\/architecture\/skill-validator-json-contract.md/);
});

test("schema note marks no change when versions are equal", () => {
  const root = makeTempWorkspace();
  const output = "artifacts/schema-note.md";

  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--output",
      output,
      "--previous-version",
      "2",
      "--current-version",
      "2",
      "--base-ref",
      "a",
      "--head-ref",
      "b",
    ],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

  const outPath = path.join(root, output);
  const content = fs.readFileSync(outPath, "utf8");

  assert.match(content, /changed: no/);
  assert.match(content, /Nenhuma mudanca de `schemaVersion` detectada/);
});

test("schema note detects drift when documented version mismatches current", () => {
  const root = makeTempWorkspace();
  const output = "artifacts/schema-note.md";

  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--output",
      output,
      "--previous-version",
      "1",
      "--current-version",
      "2",
      "--documented-previous-version",
      "1",
      "--documented-current-version",
      "1",
      "--contract-updated",
      "false",
      "--base-ref",
      "a",
      "--head-ref",
      "b",
    ],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

  const outPath = path.join(root, output);
  const content = fs.readFileSync(outPath, "utf8");

  assert.match(content, /driftDetected: yes/);
  assert.match(content, /documentMatchesCurrent: no/);
  assert.match(content, /## Drift/);
});

test("schema note fails when --fail-on-drift is enabled and drift exists", () => {
  const root = makeTempWorkspace();
  const output = "artifacts/schema-note.md";

  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--fail-on-drift",
      "--output",
      output,
      "--previous-version",
      "1",
      "--current-version",
      "2",
      "--documented-previous-version",
      "1",
      "--documented-current-version",
      "1",
      "--contract-updated",
      "false",
      "--base-ref",
      "a",
      "--head-ref",
      "b",
    ],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

  const outPath = path.join(root, output);
  const content = fs.readFileSync(outPath, "utf8");
  assert.match(content, /driftDetected: yes/);
});

test("schema note fails for invalid numeric version argument", () => {
  const root = makeTempWorkspace();
  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--output",
      "artifacts/schema-note.md",
      "--previous-version",
      "abc",
      "--current-version",
      "2",
    ],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Valor invalido para --previous-version/);
});

test("schema note fails for invalid --contract-updated value", () => {
  const root = makeTempWorkspace();
  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--output",
      "artifacts/schema-note.md",
      "--previous-version",
      "1",
      "--current-version",
      "2",
      "--contract-updated",
      "maybe",
    ],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Valor invalido para --contract-updated/);
});

test("schema note fails when output path is a directory", () => {
  const root = makeTempWorkspace();
  const outputDir = path.join(root, "artifacts", "schema-dir");
  fs.mkdirSync(outputDir, { recursive: true });

  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--output",
      "artifacts/schema-dir",
      "--previous-version",
      "1",
      "--current-version",
      "2",
    ],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Falha ao escrever output/);
});
