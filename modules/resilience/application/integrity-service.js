import path from "node:path";
import { readFile as fsReadFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseIntegrityManifest } from "../../../shared/config/parsers.js";

export function createIntegrityRuntimeService({
  baseDir,
  manifestPath,
  targets = [],
  staleAfterMs = 30_000,
} = {}) {
  const state = {
    lastCheckedAt: null,
    status: "unknown",
    mismatches: [],
    missingFiles: [],
    checkedFiles: [],
    reason: "integrity-check-not-run",
    staleAfterMs,
  };

  async function computeSha256(filePath) {
    const content = await fsReadFile(filePath);
    return createHash("sha256").update(content).digest("hex");
  }

  async function runCheck() {
    const now = new Date().toISOString();
    const resolvedTargets = [
      ...new Set(targets.map((item) => String(item || "").trim()).filter(Boolean)),
    ];

    if (!manifestPath) {
      state.lastCheckedAt = now;
      state.status = "unknown";
      state.reason = "manifest-path-not-configured";
      state.checkedFiles = [];
      state.mismatches = [];
      state.missingFiles = [];
      return getStatus();
    }

    let manifestEntries = [];
    try {
      const manifestContent = await fsReadFile(manifestPath, "utf8");
      manifestEntries = parseIntegrityManifest(manifestContent);
    } catch {
      state.lastCheckedAt = now;
      state.status = "unknown";
      state.reason = "manifest-not-found";
      state.checkedFiles = [];
      state.mismatches = [];
      state.missingFiles = [];
      return getStatus();
    }

    const manifestMap = new Map(manifestEntries.map((entry) => [entry.file, entry.hash]));
    const filesToCheck = resolvedTargets.length
      ? resolvedTargets
      : Array.from(manifestMap.keys());

    const mismatches = [];
    const missingFiles = [];
    const checkedFiles = [];

    for (const relativePath of filesToCheck) {
      const expectedHash = manifestMap.get(relativePath) || null;
      if (!expectedHash) {
        mismatches.push({
          file: relativePath,
          reason: "missing-from-manifest",
        });
        continue;
      }

      const fullPath = path.join(baseDir, relativePath);
      try {
        const actualHash = await computeSha256(fullPath);
        checkedFiles.push(relativePath);
        if (actualHash !== expectedHash) {
          mismatches.push({
            file: relativePath,
            reason: "hash-mismatch",
          });
        }
      } catch {
        missingFiles.push(relativePath);
      }
    }

    state.lastCheckedAt = now;
    state.checkedFiles = checkedFiles;
    state.mismatches = mismatches;
    state.missingFiles = missingFiles;

    if (mismatches.length || missingFiles.length) {
      state.status = "failed";
      state.reason = "integrity-divergence-detected";
    } else {
      state.status = "ok";
      state.reason = "integrity-verified";
    }

    return getStatus();
  }

  function getStatus() {
    return {
      status: state.status,
      reason: state.reason,
      lastCheckedAt: state.lastCheckedAt,
      staleAfterMs: state.staleAfterMs,
      checkedFiles: [...state.checkedFiles],
      mismatches: [...state.mismatches],
      missingFiles: [...state.missingFiles],
    };
  }

  async function getOrRefresh({ force = false } = {}) {
    if (!force && state.lastCheckedAt) {
      const ageMs = Date.now() - new Date(state.lastCheckedAt).getTime();
      if (ageMs <= state.staleAfterMs) {
        return getStatus();
      }
    }
    return runCheck();
  }

  return {
    runCheck,
    getStatus,
    getOrRefresh,
  };
}
