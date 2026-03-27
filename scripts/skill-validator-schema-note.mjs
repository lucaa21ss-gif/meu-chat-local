#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function extractSchemaVersion(content) {
  if (!content) return null;
  const match = content.match(/schemaVersion\s*:\s*([0-9]+)/);
  return match ? Number(match[1]) : null;
}

function readFileFromRef(ref, filePath) {
  try {
    return execSync(`git show ${ref}:${filePath}`, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  const baseRef = getArgValue("--base-ref") || "HEAD~1";
  const headRef = getArgValue("--head-ref") || "HEAD";
  const outputArg = getArgValue("--output") || "artifacts/skill-validator-schema-change.md";
  const outputPath = path.resolve(rootDir, outputArg);

  const previousVersionArg = getArgValue("--previous-version");
  const currentVersionArg = getArgValue("--current-version");

  const validatorPath = "scripts/skill-validator.mjs";

  const currentContent = currentVersionArg
    ? null
    : readFileSafe(path.resolve(rootDir, validatorPath));
  const previousContent = previousVersionArg ? null : readFileFromRef(baseRef, validatorPath);

  const currentVersion = currentVersionArg
    ? Number(currentVersionArg)
    : extractSchemaVersion(currentContent);
  const previousVersion = previousVersionArg
    ? Number(previousVersionArg)
    : extractSchemaVersion(previousContent);

  const hasVersionChange =
    Number.isFinite(currentVersion) &&
    Number.isFinite(previousVersion) &&
    currentVersion !== previousVersion;

  const generatedAt = new Date().toISOString();

  let body = "";
  body += "# Skill Validator Schema Change Note\n\n";
  body += `- generatedAt: ${generatedAt}\n`;
  body += `- baseRef: ${baseRef}\n`;
  body += `- headRef: ${headRef}\n`;
  body += `- previousSchemaVersion: ${previousVersion ?? "unknown"}\n`;
  body += `- currentSchemaVersion: ${currentVersion ?? "unknown"}\n`;
  body += `- changed: ${hasVersionChange ? "yes" : "no"}\n\n`;

  if (hasVersionChange) {
    body += "## Impacto\n\n";
    body += "Foi detectada mudanca de `schemaVersion` no payload JSON do skill-validator.\n\n";
    body += "## Checklist\n\n";
    body += "- [ ] Atualizar docs/architecture/skill-validator-json-contract.md\n";
    body += "- [ ] Atualizar testes de contrato em scripts/skill-validator.test.mjs\n";
    body += "- [ ] Revisar consumidores de artifact JSON no CI\n";
  } else {
    body += "Nenhuma mudanca de `schemaVersion` detectada neste intervalo.\n";
  }

  ensureDirFor(outputPath);
  fs.writeFileSync(outputPath, body, "utf8");
}

main();
