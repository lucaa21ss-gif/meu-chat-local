#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const STEP_DEFINITIONS = [
  { name: "validator-tests", npmScript: "test:skills:validator" },
  { name: "schema-note-tests", npmScript: "test:skills:schema-note" },
  { name: "enforcement-status-tests", npmScript: "test:skills:enforcement-status" },
  { name: "strict-validator", npmScript: "skill:validate:strict" },
];

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function parseOnlyFilter() {
  const onlyArg = getArgValue("--only");
  if (!onlyArg) return null;

  return onlyArg
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectSteps(onlyFilter) {
  if (!onlyFilter) return STEP_DEFINITIONS;

  const available = new Set(STEP_DEFINITIONS.map((step) => step.name));
  const invalid = onlyFilter.filter((name) => !available.has(name));

  if (invalid.length > 0) {
    throw new Error(`Etapas invalidas em --only: ${invalid.join(", ")}`);
  }

  return STEP_DEFINITIONS.filter((step) => onlyFilter.includes(step.name));
}

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function runStep(step) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(npmExecutable(), ["run", step.npmScript], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const endedAt = new Date().toISOString();

  return {
    name: step.name,
    npmScript: step.npmScript,
    startedAt,
    endedAt,
    exitCode: result.status ?? 1,
    success: (result.status ?? 1) === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function toJsonReport(payload) {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function toMarkdownReport(payload) {
  const lines = [];
  lines.push("# Skill Governance Preflight");
  lines.push("");
  lines.push(`- generatedAt: ${payload.generatedAt}`);
  lines.push(`- dryRun: ${payload.dryRun ? "yes" : "no"}`);
  lines.push(`- success: ${payload.success ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Steps");
  lines.push("");

  for (const step of payload.results) {
    lines.push(
      `- ${step.name}: ${step.success ? "ok" : step.dryRun ? "planned" : "failed"} (${step.npmScript})`,
    );
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function outputReport(content, outputArg) {
  if (!outputArg) {
    process.stdout.write(content);
    return;
  }

  const outputPath = path.resolve(process.cwd(), outputArg);
  try {
    ensureDirFor(outputPath);
    fs.writeFileSync(outputPath, content, "utf8");
  } catch (err) {
    fail(`Falha ao escrever output em ${outputPath}: ${err.message}`);
  }
}

function main() {
  const jsonMode = process.argv.includes("--json");
  const dryRun = process.argv.includes("--dry-run");
  const outputArg = getArgValue("--output");

  let steps;
  try {
    steps = selectSteps(parseOnlyFilter());
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }

  const results = [];
  let success = true;

  for (const step of steps) {
    if (dryRun) {
      results.push({
        name: step.name,
        npmScript: step.npmScript,
        success: true,
        dryRun: true,
      });
      continue;
    }

    const result = runStep(step);
    results.push(result);

    if (!result.success) {
      success = false;
      break;
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    dryRun,
    success,
    selectedStepNames: steps.map((step) => step.name),
    results,
  };

  const content = jsonMode ? toJsonReport(payload) : toMarkdownReport(payload);
  outputReport(content, outputArg);

  if (!success) {
    process.exitCode = 1;
  }
}

main();