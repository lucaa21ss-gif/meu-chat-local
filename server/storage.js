import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

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

    async cleanup({ target = "all", olderThanDays = 30, maxDeleteMb, execute = false }) {
      const safeTarget = parseTarget(target);
      const safeOlderThanDays = parseOlderThanDays(olderThanDays);
      const maxDeleteBytes = parseMaxDeleteMb(maxDeleteMb);
      const selectedDirs = selectCleanupDirs(baseDir, safeTarget);

      const plan = [];
      let estimatedFreedBytes = 0;

      for (const [type, dirPath] of Object.entries(selectedDirs)) {
        const candidates = await listCleanupCandidates(dirPath, safeOlderThanDays);
        for (const item of candidates) {
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
      };
    },
  };
}
