import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStructuralRunbookSuggestions } from "./runbook-suggestions.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../");

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

async function checkFile(p) {
  const fullPath = path.join(rootDir, p);
  try {
    await fs.access(fullPath);
    console.log(`✅ [FILESYSTEM] OK: ${p}`);
    return {
      name: "filesystem",
      ref: p,
      ok: true,
      details: { error: null },
    };
  } catch {
    console.log(`❌ [FILESYSTEM] MISSING: ${p}`);
    return {
      name: "filesystem",
      ref: p,
      ok: false,
      details: { error: "arquivo ausente" },
    };
  }
}

async function checkImport(p) {
  const fullPath = path.join(rootDir, p);
  try {
    await import(fullPath);
    console.log(`✅ [IMPORT] OK: ${p}`);
    return {
      name: "import",
      ref: p,
      ok: true,
      details: { error: null },
    };
  } catch (e) {
    console.log(`❌ [IMPORT] FAILED: ${p}`);
    console.log(`   Error: ${e.message}`);
    return {
      name: "import",
      ref: p,
      ok: false,
      details: { error: e.message },
    };
  }
}

async function runSmokeTest() {
  console.log("--- SMOKE TEST VERBOSE ---\n");
  const outputPath = getArg("--output", path.join("artifacts", "smoke", "smoke-report.json"));
  
  const filesToVerify = [
    "apps/api/src/entrypoints/index.js",
    "apps/api/src/http/app-create.js",
    "platform/persistence/sqlite/db.js",
    "modules/backup/application/backup-service.js"
  ];

  const importsToVerify = [
    "apps/api/src/entrypoints/index.js",
    "shared/config/app-constants.js"
  ];

  const checks = [];
  for (const f of filesToVerify) {
    checks.push(await checkFile(f));
  }
  for (const i of importsToVerify) {
    checks.push(await checkImport(i));
  }

  const failedChecks = checks.filter((item) => !item.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    gate: {
      status: failedChecks.length ? "blocked" : "approved",
      reasons: failedChecks.map((item) => `${item.name}:${item.ref}: ${item.details.error}`),
    },
    checks,
    runbookSuggestions: buildStructuralRunbookSuggestions(checks),
  };

  await fs.mkdir(path.dirname(path.join(rootDir, outputPath)), { recursive: true });
  await fs.writeFile(path.join(rootDir, outputPath), JSON.stringify(report, null, 2), "utf8");

  if (!failedChecks.length) {
    console.log("\n🚀 FINAL STATUS: SUCCESS");
    console.log(`Relatorio: ${outputPath}`);
    process.exit(0);
  } else {
    console.log("\n⚠️ FINAL STATUS: FAILED");
    console.log(`Relatorio: ${outputPath}`);
    if (report.runbookSuggestions.length) {
      console.log("Runbooks sugeridos:");
      for (const suggestion of report.runbookSuggestions) {
        console.log(`- ${suggestion.path}: ${suggestion.reason}`);
      }
    }
    process.exit(1);
  }
}

runSmokeTest().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
