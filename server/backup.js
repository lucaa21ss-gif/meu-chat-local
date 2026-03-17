import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as tar from "tar";

function sanitizeDirName(dirName) {
  const normalized = String(dirName || "")
    .trim()
    .replace(/\\/g, "/");
  if (!normalized) return null;
  if (normalized.includes("..")) return null;
  return normalized.split("/")[0] || null;
}

async function safeRm(targetPath) {
  await fsp.rm(targetPath, { recursive: true, force: true });
}

async function copyIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return false;
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.cp(sourcePath, targetPath, { recursive: true, force: true });
  return true;
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function createBackupArchive({
  dbPath,
  includeDirs = [],
  backupRoot,
  createDbSnapshot,
}) {
  const safeDbPath = String(dbPath || "").trim();
  if (!safeDbPath) throw new Error("dbPath obrigatorio para backup");
  if (typeof createDbSnapshot !== "function") {
    throw new Error("createDbSnapshot obrigatorio para backup");
  }

  const safeBackupRoot = String(backupRoot || "").trim();
  if (!safeBackupRoot) throw new Error("backupRoot obrigatorio");

  const baseDir = path.dirname(safeDbPath);
  const dirs = Array.from(
    new Set(includeDirs.map(sanitizeDirName).filter(Boolean)),
  );

  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "chat-backup-"));
  try {
    const snapshotPath = path.join(workDir, "chat.db");
    await createDbSnapshot(snapshotPath);

    const dataDir = path.join(workDir, "data");
    await fsp.mkdir(dataDir, { recursive: true });

    const copiedDirs = [];
    for (const dirName of dirs) {
      const sourcePath = path.join(baseDir, dirName);
      const targetPath = path.join(dataDir, dirName);
      const copied = await copyIfExists(sourcePath, targetPath);
      if (copied) copiedDirs.push(dirName);
    }

    const manifest = {
      version: 1,
      createdAt: new Date().toISOString(),
      includes: ["chat.db", ...copiedDirs.map((name) => `data/${name}`)],
    };

    await fsp.writeFile(
      path.join(workDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf8",
    );

    await fsp.mkdir(safeBackupRoot, { recursive: true });
    const fileName = `meu-chat-local-backup-${nowStamp()}.tgz`;
    const archivePath = path.join(safeBackupRoot, fileName);

    await tar.create(
      {
        gzip: true,
        cwd: workDir,
        file: archivePath,
      },
      ["chat.db", "manifest.json", "data"],
    );

    const archiveBuffer = await fsp.readFile(archivePath);
    return {
      fileName,
      archivePath,
      sizeBytes: archiveBuffer.length,
      archiveBuffer,
      includes: manifest.includes,
    };
  } finally {
    await safeRm(workDir);
  }
}

export async function restoreBackupArchive({
  archiveBuffer,
  dbPath,
  includeDirs = [],
  closeDb,
  initDb,
}) {
  if (!Buffer.isBuffer(archiveBuffer) || archiveBuffer.length === 0) {
    throw new Error("Arquivo de backup invalido");
  }

  const safeDbPath = String(dbPath || "").trim();
  if (!safeDbPath) throw new Error("dbPath obrigatorio para restauracao");
  if (typeof closeDb !== "function" || typeof initDb !== "function") {
    throw new Error("closeDb e initDb obrigatorios para restauracao");
  }

  const baseDir = path.dirname(safeDbPath);
  const dirs = Array.from(
    new Set(includeDirs.map(sanitizeDirName).filter(Boolean)),
  );

  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "chat-restore-"));
  let dbClosed = false;
  try {
    const archivePath = path.join(workDir, `${randomUUID()}.tgz`);
    const extractDir = path.join(workDir, "extract");
    await fsp.mkdir(extractDir, { recursive: true });

    await fsp.writeFile(archivePath, archiveBuffer);
    await tar.extract({
      cwd: extractDir,
      file: archivePath,
      gzip: true,
      strict: true,
    });

    const restoredDb = path.join(extractDir, "chat.db");
    const restoredManifest = path.join(extractDir, "manifest.json");

    if (!fs.existsSync(restoredDb) || !fs.existsSync(restoredManifest)) {
      throw new Error("Backup invalido: estrutura obrigatoria ausente");
    }

    await closeDb();
    dbClosed = true;

    await safeRm(safeDbPath);
    await safeRm(`${safeDbPath}-wal`);
    await safeRm(`${safeDbPath}-shm`);

    await fsp.mkdir(path.dirname(safeDbPath), { recursive: true });
    await fsp.copyFile(restoredDb, safeDbPath);

    for (const dirName of dirs) {
      const targetPath = path.join(baseDir, dirName);
      const sourcePath = path.join(extractDir, "data", dirName);
      await safeRm(targetPath);
      if (fs.existsSync(sourcePath)) {
        await fsp.cp(sourcePath, targetPath, { recursive: true, force: true });
      }
    }

    await initDb();
    dbClosed = false;

    return {
      restored: true,
      restoredAt: new Date().toISOString(),
      dbPath: safeDbPath,
      restoredDirs: dirs,
    };
  } catch (error) {
    if (dbClosed) {
      try {
        await initDb();
      } catch {
        // Mantem erro original de restauracao; initDb sera tentado no proximo request.
      }
    }
    throw error;
  } finally {
    await safeRm(workDir);
  }
}
