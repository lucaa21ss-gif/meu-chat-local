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
  lines.push(`- strictIo: ${payload.strictIo ? "yes" : "no"}`);
  lines.push(`- artifactsDir: ${payload.artifactsDir}`);
  lines.push(`- success: ${payload.success ? "yes" : "no"}`);
  lines.push("");

  if (payload.ioCheck?.enabled) {
    lines.push("## I/O precheck");
    lines.push("");
    lines.push(`- status: ${payload.ioCheck.ok ? "ok" : "failed"}`);
    lines.push(`- artifactsDir: ${payload.ioCheck.artifactsDir}`);
    if (!payload.ioCheck.ok && payload.ioCheck.error) {
      lines.push(`- error: ${payload.ioCheck.error}`);
    }
    lines.push("");
  }

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

function runIoPrecheck(artifactsDirArg) {
  const artifactsDir = path.resolve(process.cwd(), artifactsDirArg || "artifacts");
  const probeFileName = `.skill-governance-preflight-${process.pid}-${Date.now()}.tmp`;
  const probeFilePath = path.join(artifactsDir, probeFileName);

  try {
    fs.mkdirSync(artifactsDir, { recursive: true });
    fs.writeFileSync(probeFilePath, "ok", "utf8");
    fs.rmSync(probeFilePath, { force: true });

    return {
      enabled: true,
      ok: true,
      artifactsDir,
      error: null,
    };
  } catch (err) {
    return {
      enabled: true,
      ok: false,
      artifactsDir,
      error: err.message,
    };
  }
}

function main() {
  const jsonMode = process.argv.includes("--json");
  const dryRun = process.argv.includes("--dry-run");
  const strictIo = process.argv.includes("--strict-io");
  const outputArg = getArgValue("--output");
  const artifactsDirArg = getArgValue("--artifacts-dir") || "artifacts";

  let steps;
  try {
    steps = selectSteps(parseOnlyFilter());
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }

  const results = [];
  let success = true;
  let ioCheck = {
    enabled: false,
    ok: null,
    artifactsDir: path.resolve(process.cwd(), artifactsDirArg),
    error: null,
  };

  if (strictIo) {
    ioCheck = runIoPrecheck(artifactsDirArg);
    if (!ioCheck.ok) {
      fail(`Falha no preflight de I/O para ${ioCheck.artifactsDir}: ${ioCheck.error}`);
    }
  }

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
    strictIo,
    artifactsDir: path.resolve(process.cwd(), artifactsDirArg),
    ioCheck,
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