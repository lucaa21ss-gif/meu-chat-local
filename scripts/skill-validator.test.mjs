import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const validatorPath = path.resolve("scripts/skill-validator.mjs");

function makeTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "skill-validator-"));
}

function writeFile(root, relPath, content) {
  const filePath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function runValidator(cwd, args = []) {
  return spawnSync(process.execPath, [validatorPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function validSkillMd(name) {
  return `---
name: ${name}
version: 1.0.0
description: skill de teste
lastReviewed: 2026-03-27
---

# Skill de Teste

## Proposito
Texto.

## Escopo
Texto.

## Instrucoes
1. Passo.

## Melhores Praticas
Texto.

## Validacao
Texto.
`;
}

test("validator strict passes for fully valid setup", () => {
  const root = makeTempWorkspace();

  writeFile(root, ".agents/skills/demo-skill/SKILL.md", validSkillMd("demo-skill"));
  writeFile(root, ".agents/skills/.template/SKILL.md", validSkillMd("template-skill"));
  writeFile(
    root,
    ".agents/SKILLS-REGISTRY.yaml",
    `schemaVersion: 1
updatedAt: 2026-03-27
owner: test

skills:
  - name: demo-skill
    version: 1.0.0
    status: migrated
    path: .agents/skills/demo-skill/SKILL.md
    tags: [test]
    requires: []

templates:
  - name: default
    path: .agents/skills/.template/SKILL.md
`,
  );

  const result = runValidator(root, ["--strict"]);

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stdout, /avisos:\s+0/);
  assert.match(result.stdout, /erros:\s+0/);
});

test("validator strict fails when a skill is missing from registry paths", () => {
  const root = makeTempWorkspace();

  writeFile(root, ".agents/skills/demo-skill/SKILL.md", validSkillMd("demo-skill"));
  writeFile(root, ".agents/skills/.template/SKILL.md", validSkillMd("template-skill"));
  writeFile(
    root,
    ".agents/SKILLS-REGISTRY.yaml",
    `schemaVersion: 1
updatedAt: 2026-03-27
owner: test

skills:

templates:
  - name: default
    path: .agents/skills/.template/SKILL.md
`,
  );

  const result = runValidator(root, ["--strict"]);

  assert.equal(result.status, 3, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Skill sem referencia no registry: .agents\/skills\/demo-skill\/SKILL.md/);
});

test("validator strict fails when registry skill entry misses required fields", () => {
  const root = makeTempWorkspace();

  writeFile(root, ".agents/skills/demo-skill/SKILL.md", validSkillMd("demo-skill"));
  writeFile(root, ".agents/skills/.template/SKILL.md", validSkillMd("template-skill"));
  writeFile(
    root,
    ".agents/SKILLS-REGISTRY.yaml",
    `schemaVersion: 1
updatedAt: 2026-03-27
owner: test

skills:
  - name: demo-skill
    version: 1.0.0
    status: migrated
    path: .agents/skills/demo-skill/SKILL.md

templates:
  - name: default
    path: .agents/skills/.template/SKILL.md
`,
  );

  const result = runValidator(root, ["--strict"]);

  assert.equal(result.status, 3, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Registry skill sem tags: demo-skill/);
  assert.match(result.stderr, /Registry skill sem requires: demo-skill/);
});

test("validator strict fails when registry references a non-existent skill path", () => {
  const root = makeTempWorkspace();

  writeFile(root, ".agents/skills/demo-skill/SKILL.md", validSkillMd("demo-skill"));
  writeFile(root, ".agents/skills/.template/SKILL.md", validSkillMd("template-skill"));
  writeFile(
    root,
    ".agents/SKILLS-REGISTRY.yaml",
    `schemaVersion: 1
updatedAt: 2026-03-27
owner: test

skills:
  - name: demo-skill
    version: 1.0.0
    status: migrated
    path: .agents/skills/does-not-exist/SKILL.md
    tags: [test]
    requires: []

templates:
  - name: default
    path: .agents/skills/.template/SKILL.md
`,
  );

  const result = runValidator(root, ["--strict"]);

  assert.equal(result.status, 3, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Registry referencia caminho inexistente: .agents\/skills\/does-not-exist\/SKILL.md/);
  assert.match(result.stderr, /Skill sem referencia no registry: .agents\/skills\/demo-skill\/SKILL.md/);
});

test("validator strict fails when skill frontmatter is malformed", () => {
  const root = makeTempWorkspace();

  writeFile(
    root,
    ".agents/skills/demo-skill/SKILL.md",
    `---
name: demo-skill
version: 1.0.0
description: skill de teste
lastReviewed: 2026-03-27

# Skill de Teste

## Proposito
Texto.

## Escopo
Texto.

## Instrucoes
1. Passo.

## Melhores Praticas
Texto.

## Validacao
Texto.
`,
  );
  writeFile(root, ".agents/skills/.template/SKILL.md", validSkillMd("template-skill"));
  writeFile(
    root,
    ".agents/SKILLS-REGISTRY.yaml",
    `schemaVersion: 1
updatedAt: 2026-03-27
owner: test

skills:
  - name: demo-skill
    version: 1.0.0
    status: migrated
    path: .agents/skills/demo-skill/SKILL.md
    tags: [test]
    requires: []

templates:
  - name: default
    path: .agents/skills/.template/SKILL.md
`,
  );

  const result = runValidator(root, ["--strict"]);

  assert.equal(result.status, 2, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /frontmatter malformado \(delimitador final ausente\)/);
});

test("validator strict fails when registry has duplicate skill names", () => {
  const root = makeTempWorkspace();

  writeFile(root, ".agents/skills/demo-skill/SKILL.md", validSkillMd("demo-skill"));
  writeFile(root, ".agents/skills/another-skill/SKILL.md", validSkillMd("another-skill"));
  writeFile(root, ".agents/skills/.template/SKILL.md", validSkillMd("template-skill"));
  writeFile(
    root,
    ".agents/SKILLS-REGISTRY.yaml",
    `schemaVersion: 1
updatedAt: 2026-03-27
owner: test

skills:
  - name: demo-skill
    version: 1.0.0
    status: migrated
    path: .agents/skills/demo-skill/SKILL.md
    tags: [test]
    requires: []

  - name: demo-skill
    version: 1.1.0
    status: migrated
    path: .agents/skills/another-skill/SKILL.md
    tags: [test]
    requires: []

templates:
  - name: default
    path: .agents/skills/.template/SKILL.md
`,
  );

  const result = runValidator(root, ["--strict"]);

  assert.equal(result.status, 3, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Registry skill com name duplicado: demo-skill \(2 entradas\)/);
});

test("validator outputs JSON report with class summary", () => {
  const root = makeTempWorkspace();

  writeFile(root, ".agents/skills/demo-skill/SKILL.md", validSkillMd("demo-skill"));
  writeFile(root, ".agents/skills/.template/SKILL.md", validSkillMd("template-skill"));
  writeFile(
    root,
    ".agents/SKILLS-REGISTRY.yaml",
    `schemaVersion: 1
updatedAt: 2026-03-27
owner: test

skills:
  - name: demo-skill
    version: 1.0.0
    status: migrated
    path: .agents/skills/demo-skill/SKILL.md

templates:
  - name: default
    path: .agents/skills/.template/SKILL.md
`,
  );

  const result = runValidator(root, ["--strict", "--json"]);

  assert.equal(result.status, 3, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const output = JSON.parse(result.stdout);
  assert.ok(output.meta.generatedAt);
  assert.equal(output.summary.exitCode, 3);
  assert.ok(output.summary.warnings > 0);
  assert.ok(output.byClass.consistency.warnings > 0);
  assert.ok(Array.isArray(output.issues));
});

test("validator JSON supports --class filter", () => {
  const root = makeTempWorkspace();

  writeFile(root, ".agents/skills/demo-skill/SKILL.md", validSkillMd("demo-skill"));
  writeFile(root, ".agents/skills/.template/SKILL.md", validSkillMd("template-skill"));
  writeFile(
    root,
    ".agents/SKILLS-REGISTRY.yaml",
    `schemaVersion: 1
updatedAt: 2026-03-27
owner: test

skills:
  - name: demo-skill
    version: 1.0.0
    status: migrated
    path: .agents/skills/demo-skill/SKILL.md

templates:
  - name: default
    path: .agents/skills/.template/SKILL.md
`,
  );

  const result = runValidator(root, ["--strict", "--json", "--class", "consistency"]);

  assert.equal(result.status, 3, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const output = JSON.parse(result.stdout);
  assert.equal(output.summary.classFilter, "consistency");
  assert.ok(output.summary.filteredWarnings > 0);
  assert.equal(output.filteredByClass.consistency.warnings, output.summary.filteredWarnings);
  assert.ok(output.issues.every((issue) => issue.class === "consistency"));
});

test("validator strict fails with invalid --class value", () => {
  const root = makeTempWorkspace();

  writeFile(root, ".agents/skills/demo-skill/SKILL.md", validSkillMd("demo-skill"));
  writeFile(root, ".agents/skills/.template/SKILL.md", validSkillMd("template-skill"));
  writeFile(
    root,
    ".agents/SKILLS-REGISTRY.yaml",
    `schemaVersion: 1
updatedAt: 2026-03-27
owner: test

skills:
  - name: demo-skill
    version: 1.0.0
    status: migrated
    path: .agents/skills/demo-skill/SKILL.md
    tags: [test]
    requires: []

templates:
  - name: default
    path: .agents/skills/.template/SKILL.md
`,
  );

  const result = runValidator(root, ["--strict", "--class", "invalid-class"]);

  assert.equal(result.status, 2, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Classe invalida para --class: invalid-class/);
});
