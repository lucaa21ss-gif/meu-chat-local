import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { validateBackupArchive } from "../../../backup.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BACKUP_RETENTION_POLICY = {
  version: "backup-layered-v1",
  shortTermDays: 7,
  mediumTermDays: 30,
  preserveValidatedBackups: 2,
};

async function getDirSizeBytes(targetPath) {
  if (!fs.existsSync(targetPath)) return 0;
  const stat = await fsp.stat(targetPath);
  if (stat.isFile()) return stat.size;
  if (!stat.isDirectory()) return 0;

  const entries = await fsp.readdir(targetPath, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    const child = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      total += await getDirSizeBytes(child);
    } else if (entry.isFile()) {
      const fileStat = await fsp.stat(child);
      total += fileStat.size;
    }
  }
  return total;
}

function parseTarget(raw) {
  const value = String(raw || "all").trim().toLowerCase();
  if (["all", "uploads", "documents", "backups"].includes(value)) {
    return value;
  }
  throw new Error("target invalido: use all, uploads, documents ou backups");
}

function parseOlderThanDays(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 3650) {
    throw new Error("olderThanDays invalido");
  }
  return parsed;
}

function parseMaxDeleteMb(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return Number.POSITIVE_INFINITY;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 102400) {
    throw new Error("maxDeleteMb invalido");
  }
  return parsed * 1024 * 1024;
}

function selectCleanupDirs(baseDir, target) {
  const all = {
    uploads: path.join(baseDir, "uploads"),
    documents: path.join(baseDir, "documents"),
    backups: path.join(baseDir, "backups"),
  };
  if (target === "all") return all;
  return { [target]: all[target] };
}

function isoDayKey(dateMs) {
  return new Date(dateMs).toISOString().slice(0, 10);
}

function isoWeekKey(dateMs) {
  const date = new Date(dateMs);
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate - yearStart) / DAY_MS) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function parsePreserveValidatedBackups(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return DEFAULT_BACKUP_RETENTION_POLICY.preserveValidatedBackups;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 20) {
    throw new Error("preserveValidatedBackups invalido");
  }
  return parsed;
}

function isBackupFileName(name) {
  const safeName = String(name || "").trim();
  return (
    safeName.startsWith("meu-chat-local-backup-") &&
    (safeName.endsWith(".tgz") || safeName.endsWith(".tgz.enc"))
  );
}

function buildLayerProtectedBackupSet(items, policy) {
  const now = Date.now();
  const sorted = [...items].sort((a, b) => b.mtimeMs - a.mtimeMs);
  const protectedMap = new Map();
  const mediumBucket = new Set();
  const longBucket = new Set();

  for (const item of sorted) {
    const ageDays = Math.max(0, Math.floor((now - item.mtimeMs) / DAY_MS));
    if (ageDays <= policy.shortTermDays) {
      protectedMap.set(item.path, "short-term");
      continue;
    }

    if (ageDays <= policy.mediumTermDays) {
      const dayKey = isoDayKey(item.mtimeMs);
      if (!mediumBucket.has(dayKey)) {
        mediumBucket.add(dayKey);
        protectedMap.set(item.path, "medium-term-daily");
      }
      continue;
    }

    const weekKey = isoWeekKey(item.mtimeMs);
    if (!longBucket.has(weekKey)) {
      longBucket.add(weekKey);
      protectedMap.set(item.path, "long-term-weekly");
    }
  }

  return protectedMap;
}

async function buildValidatedProtectedBackupSet(items, preserveCount, passphrase) {
  if (!preserveCount || preserveCount < 1) return new Map();
  const sorted = [...items].sort((a, b) => b.mtimeMs - a.mtimeMs);
  const validated = [];

  for (const item of sorted) {
    try {
      const archiveBuffer = await fsp.readFile(item.path);
      await validateBackupArchive({ archiveBuffer, passphrase });
      validated.push(item);
    } catch {
      // arquivo invalido ou criptografado sem passphrase nao entra no grupo protegido
    }
  }

  const protectedMap = new Map();
  validated.slice(0, preserveCount).forEach((item) => {
    protectedMap.set(item.path, "validated-recent");
  });
  return protectedMap;
}

async function listCleanupCandidates(dirPath, olderThanDays) {
  if (!fs.existsSync(dirPath)) return [];
  const thresholdMs = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  const candidates = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (!entry.isFile()) continue;
    const stat = await fsp.stat(fullPath);
    if (olderThanDays > 0 && stat.mtimeMs > thresholdMs) continue;
    candidates.push({
      path: fullPath,
      name: entry.name,
      sizeBytes: stat.size,
      mtime: new Date(stat.mtimeMs).toISOString(),
    });
  }

  return candidates.sort((a, b) => a.mtime.localeCompare(b.mtime));
}

export function createStorageService(config = {}) {
  const baseDir = String(config.baseDir || "").trim();
  const dbPath = String(config.dbPath || "").trim();

  if (!baseDir) throw new Error("baseDir obrigatorio para storage service");
  if (!dbPath) throw new Error("dbPath obrigatorio para storage service");
  const policy = {
    ...DEFAULT_BACKUP_RETENTION_POLICY,
    ...(config.backupRetentionPolicy || {}),
  };

  return {
    async getUsage() {
      const dbBytes = await getDirSizeBytes(dbPath);
      const uploadsBytes = await getDirSizeBytes(path.join(baseDir, "uploads"));
      const documentsBytes = await getDirSizeBytes(
        path.join(baseDir, "documents"),
      );
      const backupsBytes = await getDirSizeBytes(path.join(baseDir, "backups"));
      const totalBytes = dbBytes + uploadsBytes + documentsBytes + backupsBytes;

      return {
        dbBytes,
        uploadsBytes,
        documentsBytes,
        backupsBytes,
        totalBytes,
      };
    },

    async cleanup({
      target = "all",
      olderThanDays = 30,
      maxDeleteMb,
      execute = false,
      preserveValidatedBackups,
      backupPassphrase,
    }) {
      const safeTarget = parseTarget(target);
      const safeOlderThanDays = parseOlderThanDays(olderThanDays);
      const maxDeleteBytes = parseMaxDeleteMb(maxDeleteMb);
      const safePreserveValidatedBackups = parsePreserveValidatedBackups(
        preserveValidatedBackups,
      );
      const safeBackupPassphrase = String(backupPassphrase || "").trim() || null;
      const selectedDirs = selectCleanupDirs(baseDir, safeTarget);

      const plan = [];
      let estimatedFreedBytes = 0;
      const skipped = [];
      const retention = {
        policy: {
          version: policy.version,
          shortTermDays: policy.shortTermDays,
          mediumTermDays: policy.mediumTermDays,
          preserveValidatedBackups: safePreserveValidatedBackups,
        },
        protectedByLayerCount: 0,
        protectedValidatedCount: 0,
      };

      for (const [type, dirPath] of Object.entries(selectedDirs)) {
        const candidates = await listCleanupCandidates(dirPath, safeOlderThanDays);
        let layerProtectedMap = new Map();
        let validatedProtectedMap = new Map();

        if (type === "backups") {
          const allBackupItems = candidates.filter((item) => isBackupFileName(item.name));
          layerProtectedMap = buildLayerProtectedBackupSet(allBackupItems, policy);
          validatedProtectedMap = await buildValidatedProtectedBackupSet(
            allBackupItems,
            safePreserveValidatedBackups,
            safeBackupPassphrase,
          );
          retention.protectedByLayerCount += layerProtectedMap.size;
          retention.protectedValidatedCount += validatedProtectedMap.size;
        }

        for (const item of candidates) {
          if (type === "backups") {
            const layerReason = layerProtectedMap.get(item.path);
            if (layerReason) {
              skipped.push({
                name: item.name,
                type,
                reason: layerReason,
              });
              continue;
            }

            const validatedReason = validatedProtectedMap.get(item.path);
            if (validatedReason) {
              skipped.push({
                name: item.name,
                type,
                reason: validatedReason,
              });
              continue;
            }
          }

          if (estimatedFreedBytes + item.sizeBytes > maxDeleteBytes) break;
          plan.push({ ...item, type });
          estimatedFreedBytes += item.sizeBytes;
        }
      }

      if (execute) {
        for (const item of plan) {
          await fsp.rm(item.path, { force: true });
        }
      }

      return {
        mode: execute ? "execute" : "dry-run",
        target: safeTarget,
        olderThanDays: safeOlderThanDays,
        files: plan.map((item) => ({
          name: item.name,
          type: item.type,
          sizeBytes: item.sizeBytes,
          mtime: item.mtime,
        })),
        filesCount: plan.length,
        estimatedFreedBytes,
        skipped,
        retention,
      };
    },
  };
}
