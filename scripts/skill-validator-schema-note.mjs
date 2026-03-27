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

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseVersionArg(flag, value) {
  if (value === null) return null;
  if (!/^\d+$/.test(value)) {
    fail(`Valor invalido para ${flag}: ${value}. Use inteiro nao negativo.`);
  }
  return Number(value);
}

function parseContractUpdatedArg(value) {
  if (value === null) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  fail(`Valor invalido para --contract-updated: ${value}. Use true ou false.`);
}

function main() {
  const baseRef = getArgValue("--base-ref") || "HEAD~1";
  const headRef = getArgValue("--head-ref") || "HEAD";
  const outputArg = getArgValue("--output") || "artifacts/skill-validator-schema-change.md";
  const outputPath = path.resolve(rootDir, outputArg);
  const failOnDrift = process.argv.includes("--fail-on-drift");

  const previousVersionArg = getArgValue("--previous-version");
  const currentVersionArg = getArgValue("--current-version");
  const documentedPreviousArg = getArgValue("--documented-previous-version");
  const documentedCurrentArg = getArgValue("--documented-current-version");
  const contractUpdatedArg = getArgValue("--contract-updated");

  const previousVersionFromArg = parseVersionArg("--previous-version", previousVersionArg);
  const currentVersionFromArg = parseVersionArg("--current-version", currentVersionArg);
  const documentedPreviousFromArg = parseVersionArg(
    "--documented-previous-version",
    documentedPreviousArg,
  );
  const documentedCurrentFromArg = parseVersionArg(
    "--documented-current-version",
    documentedCurrentArg,
  );
  const contractUpdatedFromArg = parseContractUpdatedArg(contractUpdatedArg);

  const validatorPath = "scripts/skill-validator.mjs";
  const contractPath = "docs/architecture/skill-validator-json-contract.md";

  const currentContent = currentVersionArg
    ? null
    : readFileSafe(path.resolve(rootDir, validatorPath));
  const previousContent = previousVersionArg ? null : readFileFromRef(baseRef, validatorPath);

  const currentContractContent = documentedCurrentArg
    ? null
    : readFileSafe(path.resolve(rootDir, contractPath));
  const previousContractContent = documentedPreviousArg ? null : readFileFromRef(baseRef, contractPath);

  const currentVersion = currentVersionArg
    ? currentVersionFromArg
    : extractSchemaVersion(currentContent);
  const previousVersion = previousVersionArg
    ? previousVersionFromArg
    : extractSchemaVersion(previousContent);

  const documentedCurrentVersion = documentedCurrentArg
    ? documentedCurrentFromArg
    : extractSchemaVersion(currentContractContent);
  const documentedPreviousVersion = documentedPreviousArg
    ? documentedPreviousFromArg
    : extractSchemaVersion(previousContractContent);

  const hasVersionChange =
    Number.isFinite(currentVersion) &&
    Number.isFinite(previousVersion) &&
    currentVersion !== previousVersion;

  const contractUpdated =
    contractUpdatedFromArg !== null
      ? contractUpdatedFromArg
      : currentContractContent !== null && previousContractContent !== null
      ? currentContractContent !== previousContractContent
      : null;

  const documentMatchesCurrent =
    Number.isFinite(currentVersion) &&
    Number.isFinite(documentedCurrentVersion) &&
    currentVersion === documentedCurrentVersion;

  const hasDrift =
    !documentMatchesCurrent ||
    (hasVersionChange && contractUpdated === false);

  const generatedAt = new Date().toISOString();

  let body = "";
  body += "# Skill Validator Schema Change Note\n\n";
  body += `- generatedAt: ${generatedAt}\n`;
  body += `- baseRef: ${baseRef}\n`;
  body += `- headRef: ${headRef}\n`;
  body += `- previousSchemaVersion: ${previousVersion ?? "unknown"}\n`;
  body += `- currentSchemaVersion: ${currentVersion ?? "unknown"}\n`;
  body += `- documentedPreviousSchemaVersion: ${documentedPreviousVersion ?? "unknown"}\n`;
  body += `- documentedCurrentSchemaVersion: ${documentedCurrentVersion ?? "unknown"}\n`;
  body += `- contractUpdated: ${contractUpdated ?? "unknown"}\n`;
  body += `- documentMatchesCurrent: ${documentMatchesCurrent ? "yes" : "no"}\n`;
  body += `- driftDetected: ${hasDrift ? "yes" : "no"}\n`;
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

  if (hasDrift) {
    body += "\n## Drift\n\n";
    body += "Foi detectado drift entre contrato documentado e payload emitido, ou mudanca sem atualizacao de contrato.\n";
  }

  ensureDirFor(outputPath);
  fs.writeFileSync(outputPath, body, "utf8");

  if (failOnDrift && hasDrift) {
    process.exitCode = 1;
  }
}

main();
