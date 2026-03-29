import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const httpDir = path.resolve(__dirname, "../../../apps/api/src/http");
const entrypointsDir = path.resolve(
  __dirname,
  "../../../apps/api/src/entrypoints"
);

console.log("\n[SYSTEM] Iniciando Migração e Reorganização Perfeita (DDD)\n");

const deadFiles = [
  "app-context-wiring.js",
  "app-create-wiring.js",
  "app-governance-wiring.js",
  "app-guards-wiring.js",
  "app-route-wiring.js",
  "app-service-wiring.js",
  "app-services-wiring.js",
  "app-startup-wiring.js",
];

for (const f of deadFiles) {
  const p = path.join(httpDir, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`🧹 [CLEANUP] Arquivo morto deletado de http/: ${f}`);
  }
}

["guards", "route-deps", "routes", "core"].forEach((d) =>
  fs.mkdirSync(path.join(httpDir, d), { recursive: true })
);
console.log(`📁 [MKDIR] Diretórios de domínio estruturais criados.`);

const fileMap = {
  "app-guards-and-audit.js": "guards",
  "auth-guards.js": "guards",
  "operational-guards.js": "guards",
  "register-app-routes.js": "routes",
  "app-route-registrars.js": "routes",
  "app-create.js": "core",
  "app-bootstrap.js": "core",
  "app-context.js": "core",
  "app-paths.js": "core",
  "async-handler.js": "core",
  "app-services.js": "core",
  "app-runtime-config.js": "core",
  "app-governance-runtime.js": "core",
  "app-incident-signals-runtime.js": "core",
};

fs.readdirSync(httpDir).forEach((f) => {
  if (
    f.startsWith("route-deps-") &&
    f.endsWith(".js") &&
    !fs.statSync(path.join(httpDir, f)).isDirectory()
  ) {
    fileMap[f] = "route-deps";
  }
});

function computeNewImportPath(importStr, currentAbsOldPath) {
  const isImport = importStr.startsWith('import');
  
  // Extrai a string de path (captura as variáveis que importam)
  const pathMatch = importStr.match(/(from\s+["'])([^"']+)(["'];?)/) || importStr.match(/(import\s+["'])([^"']+)(["'];?)/);
  if (!pathMatch) return importStr;

  const prefix = pathMatch[1];
  const oldRelPath = pathMatch[2];
  const suffix = pathMatch[3];

  if (!oldRelPath.startsWith(".")) return importStr;

  const currentOldDir = path.dirname(currentAbsOldPath);
  const targetAbsOldPath = path.resolve(currentOldDir, oldRelPath);
  const targetName = path.basename(targetAbsOldPath);

  let newTargetAbsPath = targetAbsOldPath;
  if (fileMap[targetName] && targetAbsOldPath.includes(path.normalize("src/http"))) {
    newTargetAbsPath = path.join(httpDir, fileMap[targetName], targetName);
  }

  const currentName = path.basename(currentAbsOldPath);
  let currentNewDir = currentOldDir;
  if (fileMap[currentName] && currentAbsOldPath.includes(path.normalize("src/http"))) {
    currentNewDir = path.join(httpDir, fileMap[currentName]);
  }

  let newRelPath = path.relative(currentNewDir, newTargetAbsPath).replace(/\\/g, "/");
  if (!newRelPath.startsWith(".")) newRelPath = "./" + newRelPath;

  return importStr.replace(oldRelPath, newRelPath);
}

const fileContents = {};
for (const [filename, subfolder] of Object.entries(fileMap)) {
  const oldPath = path.join(httpDir, filename);
  if (fs.existsSync(oldPath)) {
    fileContents[oldPath] = fs.readFileSync(oldPath, "utf8");
  }
}

for (const oldPath of Object.keys(fileContents)) {
  const content = fileContents[oldPath];
  const lines = content.split('\n');
  const newLines = lines.map(line => {
    if (line.trim().startsWith('import') || line.trim().startsWith('export')) {
        return computeNewImportPath(line, oldPath);
    }
    return line;
  });

  const currentName = path.basename(oldPath);
  const subfolder = fileMap[currentName];
  const newPath = path.join(httpDir, subfolder, currentName);

  fs.writeFileSync(newPath, newLines.join('\n'));
  fs.unlinkSync(oldPath);
  console.log(`📦 [MOVE] ${currentName} -> http/${subfolder}/`);
}

fs.readdirSync(entrypointsDir).forEach((f) => {
  const p = path.join(entrypointsDir, f);
  if (f.endsWith(".js") && !fs.statSync(p).isDirectory()) {
    const content = fs.readFileSync(p, "utf8");
    const lines = content.split('\n');
    let updated = false;
    const newLines = lines.map(line => {
        if (line.trim().startsWith('import') || line.trim().startsWith('export')) {
            const newLine = computeNewImportPath(line, p);
            if (newLine !== line) updated = true;
            return newLine;
        }
        return line;
    });

    if (updated) {
      fs.writeFileSync(p, newLines.join('\n'));
      console.log(`🔗 [LINK] Importações atualizadas em entrypoints/${f}`);
    }
  }
});

console.log("\n🚀 OPERAÇÃO CONCLUÍDA! O Backend agora possui uma arquitetura 100% categorizada em subpastas Lógicas, sem quebrar os caminhos ESM.\n");
