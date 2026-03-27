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

const CONFIDENCE_PROFILES = {
  local: {
    readyDryRun: 80,
    readyReal: 100,
    blockedIo: 20,
    blockedStep: 35,
    blockedUnknown: 10,
  },
  ci: {
    readyDryRun: 70,
    readyReal: 95,
    blockedIo: 15,
    blockedStep: 30,
    blockedUnknown: 5,
  },
};

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

function parseConfidenceProfile() {
  const explicitProfile = getArgValue("--confidence-profile");
  const profile = explicitProfile || (process.env.CI ? "ci" : "local");
  if (!Object.hasOwn(CONFIDENCE_PROFILES, profile)) {
    throw new Error(
      `Perfil invalido em --confidence-profile: ${profile}. Valores aceitos: ${Object.keys(CONFIDENCE_PROFILES).join(", ")}`,
    );
  }

  return profile;
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

function buildExecutionContext() {
  const isCi = Boolean(process.env.CI);
  const github = {
    sha: process.env.GITHUB_SHA || null,
    ref: process.env.GITHUB_REF || null,
    eventName: process.env.GITHUB_EVENT_NAME || null,
    runId: process.env.GITHUB_RUN_ID || null,
  };

  return {
    ci: isCi,
    provider: github.sha || github.ref || github.eventName || github.runId ? "github" : null,
    github,
  };
}

function calculateStepFailureConfidence({ profile, results, selectedStepCount }) {
  const base = profile.blockedStep;
  const totalSelected = Math.max(selectedStepCount || 0, 1);
  const succeededBeforeFailure = results.filter((step) => step.success === true && step.dryRun !== true).length;
  const progressRatio = Math.min(1, succeededBeforeFailure / totalSelected);
  const progressBonus = Math.round(progressRatio * 25);
  const maxForBlocked = Math.max(base, profile.readyReal - 5);

  return Math.min(maxForBlocked, base + progressBonus);
}

function buildStatusSummary({ success, dryRun, ioCheck, results, confidenceProfile, selectedStepCount }) {
  const profile = CONFIDENCE_PROFILES[confidenceProfile];

  if (success) {
    return {
      status: "READY",
      reason: dryRun
        ? "Dry-run concluido: etapas planejadas sem execucao real."
        : "Todas as etapas selecionadas finalizaram com sucesso.",
      nextAction: dryRun
        ? "Execute sem --dry-run para validar a bateria completa no ambiente atual."
        : "Nenhuma acao corretiva imediata necessaria.",
      confidence: dryRun ? profile.readyDryRun : profile.readyReal,
    };
  }

  if (ioCheck?.enabled && ioCheck.ok === false) {
    return {
      status: "BLOCKED",
      reason: `Falha no precheck de I/O em ${ioCheck.artifactsDir}.`,
      nextAction: "Verifique permissao de escrita e validade do artifactsDir configurado.",
      confidence: profile.blockedIo,
    };
  }

  const failedStep = results.find((step) => step.success === false);
  if (failedStep) {
    const blockedStepConfidence = calculateStepFailureConfidence({
      profile,
      results,
      selectedStepCount,
    });

    return {
      status: "BLOCKED",
      reason: `Etapa falhou: ${failedStep.name}.`,
      nextAction: `Execute manualmente: npm run ${failedStep.npmScript}`,
      confidence: blockedStepConfidence,
    };
  }

  return {
    status: "BLOCKED",
    reason: "Falha detectada sem etapa identificada.",
    nextAction: "Revise logs completos do preflight para identificar a causa raiz.",
    confidence: profile.blockedUnknown,
  };
}

function toMarkdownReport(payload) {
  const lines = [];
  lines.push("# Skill Governance Preflight");
  lines.push("");
  lines.push(`- generatedAt: ${payload.generatedAt}`);
  lines.push(`- dryRun: ${payload.dryRun ? "yes" : "no"}`);
  lines.push(`- strictIo: ${payload.strictIo ? "yes" : "no"}`);
  lines.push(`- artifactsDir: ${payload.artifactsDir}`);
  lines.push(`- confidenceProfile: ${payload.confidenceProfile}`);
  lines.push(`- success: ${payload.success ? "yes" : "no"}`);
  lines.push("");

  if (payload.statusSummary) {
    lines.push("## Summary");
    lines.push("");
    const statusTag = payload.statusSummary.status === "READY" ? "[READY]" : "[BLOCKED]";
    lines.push(`- status: ${statusTag} ${payload.statusSummary.status}`);
    lines.push(`- confidence: ${payload.statusSummary.confidence}`);
    lines.push(`- reason: ${payload.statusSummary.reason}`);
    lines.push(`- nextAction: ${payload.statusSummary.nextAction}`);
    lines.push("");
  }

  if (payload.executionContext?.ci) {
    lines.push("## Execution context");
    lines.push("");
    lines.push(`- ci: yes`);
    lines.push(`- provider: ${payload.executionContext.provider || "unknown"}`);
    lines.push(`- github.sha: ${payload.executionContext.github?.sha || "(unset)"}`);
    lines.push(`- github.ref: ${payload.executionContext.github?.ref || "(unset)"}`);
    lines.push(`- github.eventName: ${payload.executionContext.github?.eventName || "(unset)"}`);
    lines.push(`- github.runId: ${payload.executionContext.github?.runId || "(unset)"}`);
    lines.push("");
  }

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
  let confidenceProfile;
  try {
    steps = selectSteps(parseOnlyFilter());
    confidenceProfile = parseConfidenceProfile();
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
    confidenceProfile,
    executionContext: buildExecutionContext(),
    ioCheck,
    success,
    selectedStepNames: steps.map((step) => step.name),
    results,
  };

  payload.statusSummary = buildStatusSummary({
    success,
    dryRun,
    ioCheck,
    results,
    confidenceProfile,
    selectedStepCount: steps.length,
  });

  const content = jsonMode ? toJsonReport(payload) : toMarkdownReport(payload);
  outputReport(content, outputArg);

  if (!success) {
    process.exitCode = 1;
  }
}

main();