#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const strictMode = process.argv.includes("--strict");

const skillsDir = path.join(rootDir, ".agents", "skills");
const registryPath = path.join(rootDir, ".agents", "SKILLS-REGISTRY.yaml");

const requiredFrontmatter = ["name", "version", "description", "lastReviewed"];
const requiredSections = [
  "## proposito",
  "## escopo",
  "## instrucoes",
  "## melhores praticas",
  "## validacao",
];

let errorCount = 0;
let warningCount = 0;

function warn(message) {
  warningCount += 1;
  console.warn(`[warn] ${message}`);
}

function error(message) {
  errorCount += 1;
  console.error(`[error] ${message}`);
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    error(`Nao foi possivel ler arquivo: ${path.relative(rootDir, filePath)}`);
    return "";
  }
}

function parseFrontmatter(content, displayPath) {
  if (!content.startsWith("---\n")) {
    warn(`${displayPath}: frontmatter ausente`);
    return {};
  }

  const endIndex = content.indexOf("\n---", 4);
  if (endIndex === -1) {
    error(`${displayPath}: frontmatter malformado (delimitador final ausente)`);
    return {};
  }

  const raw = content.slice(4, endIndex).trim();
  const map = {};

  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, "");
    map[key] = value;
  }

  return map;
}

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function validateSkillFile(filePath) {
  const relPath = path.relative(rootDir, filePath);
  const content = readFileSafe(filePath);
  if (!content) return;

  const frontmatter = parseFrontmatter(content, relPath);

  for (const key of requiredFrontmatter) {
    if (!frontmatter[key]) {
      warn(`${relPath}: campo obrigatorio ausente no frontmatter -> ${key}`);
    }
  }

  if (frontmatter.name) {
    const folderName = path.basename(path.dirname(filePath));
    if (folderName !== ".template" && frontmatter.name !== folderName) {
      warn(`${relPath}: name (${frontmatter.name}) difere do nome da pasta (${folderName})`);
    }

    if (folderName !== ".template" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(frontmatter.name)) {
      warn(`${relPath}: name fora do padrao kebab-case`);
    }
  }

  const normalizedContent = normalizeText(content);

  for (const section of requiredSections) {
    if (!normalizedContent.includes(section)) {
      warn(`${relPath}: secao recomendada ausente -> ${section}`);
    }
  }
}

function getSkillFiles() {
  if (!fs.existsSync(skillsDir)) {
    error("Diretorio .agents/skills nao encontrado");
    return [];
  }

  const folders = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const files = [];
  for (const folder of folders) {
    const candidate = path.join(skillsDir, folder, "SKILL.md");
    if (fs.existsSync(candidate)) files.push(candidate);
  }

  return files;
}

function validateRegistryFile() {
  if (!fs.existsSync(registryPath)) {
    error("Arquivo .agents/SKILLS-REGISTRY.yaml nao encontrado");
    return;
  }

  const content = readFileSafe(registryPath);
  if (!content) return;

  const pathLines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("path:"));

  if (pathLines.length === 0) {
    warn("Registry sem entradas de path");
    return;
  }

  for (const line of pathLines) {
    const refPath = line.replace("path:", "").trim();
    const fullPath = path.join(rootDir, refPath);
    if (!fs.existsSync(fullPath)) {
      warn(`Registry referencia caminho inexistente: ${refPath}`);
    }
  }
}

function main() {
  const files = getSkillFiles();
  if (files.length === 0) {
    error("Nenhum SKILL.md encontrado em .agents/skills");
  }

  for (const file of files) {
    validateSkillFile(file);
  }

  validateRegistryFile();

  const totalIssues = errorCount + warningCount;
  console.log(`\nResumo skill-validator`);
  console.log(`- skills avaliadas: ${files.length}`);
  console.log(`- erros: ${errorCount}`);
  console.log(`- avisos: ${warningCount}`);

  if (strictMode && totalIssues > 0) {
    process.exitCode = 1;
    return;
  }

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

main();
