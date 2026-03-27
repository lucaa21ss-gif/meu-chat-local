#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function isEnabled(rawValue) {
  if (!rawValue) return false;
  return /^(1|true|yes|on)$/i.test(rawValue.trim());
}

function buildPayload(rawValue) {
  const enabled = isEnabled(rawValue);
  return {
    generatedAt: new Date().toISOString(),
    variable: "SKILL_SCHEMA_CONTRACT_ENFORCE",
    rawValue: rawValue ?? null,
    enabled,
    behavior: enabled
      ? "CI falha quando drift de contrato e detectado."
      : "CI apenas reporta drift de contrato sem falhar o job.",
    recommendation: enabled
      ? "Mantenha o contrato JSON e os testes atualizados no mesmo PR."
      : "Para bloquear drift automaticamente, configure SKILL_SCHEMA_CONTRACT_ENFORCE=true.",
  };
}

function toMarkdown(payload) {
  return [
    "# Skill Schema Contract Enforcement Status",
    "",
    `- generatedAt: ${payload.generatedAt}`,
    `- variable: ${payload.variable}`,
    `- rawValue: ${payload.rawValue ?? "(unset)"}`,
    `- enabled: ${payload.enabled ? "yes" : "no"}`,
    "",
    "## Behavior",
    "",
    payload.behavior,
    "",
    "## Recommendation",
    "",
    payload.recommendation,
    "",
  ].join("\n");
}

function main() {
  const rawValue = process.env.SKILL_SCHEMA_CONTRACT_ENFORCE;
  const outputArg = getArgValue("--output");
  const jsonMode = process.argv.includes("--json");
  const payload = buildPayload(rawValue);
  const content = jsonMode ? `${JSON.stringify(payload, null, 2)}\n` : toMarkdown(payload);

  if (!outputArg) {
    process.stdout.write(content);
    return;
  }

  const outputPath = path.resolve(process.cwd(), outputArg);
  ensureDirFor(outputPath);
  fs.writeFileSync(outputPath, content, "utf8");
}

main();