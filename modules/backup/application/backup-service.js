import path from "node:path";
import {
  readdir as fsReaddir,
  stat as fsStat,
  readFile as fsReadFile,
} from "node:fs/promises";
import {
  createBackupArchive,
  restoreBackupArchive,
  validateBackupArchive,
} from "../../../platform/fs/backup/backup-archive.js";
import {
  closeDb,
  createDbSnapshot,
  initDb,
} from "../../../platform/persistence/sqlite/db.js";
import { parseDirList, parsePositiveInt } from "../../../shared/config/parsers.js";

async function pruneBackups(backupRoot, maxFiles) {
  if (!Number.isFinite(maxFiles) || maxFiles < 1) return;
  const fs = await import("node:fs/promises");
  let entries = [];
  try {
    entries = await fs.readdir(backupRoot, { withFileTypes: true });
  } catch {
    return;
  }

  const files = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.startsWith("meu-chat-local-backup-") &&
          entry.name.endsWith(".tgz"),
      )
      .map(async (entry) => {
        const fullPath = path.join(backupRoot, entry.name);
        const stat = await fs.stat(fullPath);
        return { fullPath, mtimeMs: stat.mtimeMs };
      }),
  );

  files
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(maxFiles)
    .forEach(async (item) => {
      try {
        await fs.rm(item.fullPath, { force: true });
      } catch {
        // Ignore pruning failures.
      }
    });
}

export function createDefaultBackupService(config = {}) {
  const dbPath = config.dbPath;
  const backupRoot =
    config.backupRoot || path.join(path.dirname(dbPath), "backups");
  const includeDirs = parseDirList(config.includeDirs || ["uploads", "documents"]);
  const backupKeep = parsePositiveInt(config.backupKeep, 10, 1, 100);

  function summarizeValidationStatus(items = []) {
    if (!items.length) return "alerta";
    if (items.some((item) => item.status === "falha")) return "falha";
    if (items.some((item) => item.status === "alerta")) return "alerta";
    return "ok";
  }

  return {
    async createBackup(options = {}) {
      const info = await createBackupArchive({
        dbPath,
        includeDirs,
        backupRoot,
        createDbSnapshot,
        passphrase: options.passphrase,
      });
      await pruneBackups(backupRoot, backupKeep);
      return info;
    },
    async restoreBackup(buffer, options = {}) {
      return restoreBackupArchive({
        archiveBuffer: buffer,
        dbPath,
        includeDirs,
        closeDb,
        initDb,
        passphrase: options.passphrase,
      });
    },
    async validateRecentBackups(options = {}) {
      const limit = parsePositiveInt(options.limit, 3, 1, 20);
      const passphrase = String(options.passphrase || "").trim() || null;

      let entries = [];
      try {
        entries = await fsReaddir(backupRoot, { withFileTypes: true });
      } catch {
        return {
          checkedAt: new Date().toISOString(),
          status: "alerta",
          reason: "Diretorio de backups indisponivel",
          limit,
          items: [],
        };
      }

      const candidates = await Promise.all(
        entries
          .filter((entry) => entry.isFile())
          .filter((entry) => {
            const name = entry.name;
            return (
              name.startsWith("meu-chat-local-backup-") &&
              (name.endsWith(".tgz") || name.endsWith(".tgz.enc"))
            );
          })
          .map(async (entry) => {
            const fullPath = path.join(backupRoot, entry.name);
            const stats = await fsStat(fullPath);
            return {
              fileName: entry.name,
              fullPath,
              mtimeMs: stats.mtimeMs,
              sizeBytes: stats.size,
            };
          }),
      );

      const selected = candidates
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
        .slice(0, limit);

      if (!selected.length) {
        return {
          checkedAt: new Date().toISOString(),
          status: "alerta",
          reason: "Nenhum arquivo de backup encontrado",
          limit,
          items: [],
        };
      }

      const items = [];
      for (const candidate of selected) {
        try {
          const archiveBuffer = await fsReadFile(candidate.fullPath);
          const result = await validateBackupArchive({
            archiveBuffer,
            passphrase,
          });
          items.push({
            fileName: candidate.fileName,
            sizeBytes: candidate.sizeBytes,
            mtime: new Date(candidate.mtimeMs).toISOString(),
            status: "ok",
            encrypted: !!result.encrypted,
            manifest: result.manifest,
          });
        } catch (error) {
          const message = String(error?.message || "Falha ao validar backup");
          const lower = message.toLowerCase();
          const missingPassphrase =
            lower.includes("passphrase") &&
            lower.includes("informe");
          items.push({
            fileName: candidate.fileName,
            sizeBytes: candidate.sizeBytes,
            mtime: new Date(candidate.mtimeMs).toISOString(),
            status: missingPassphrase ? "alerta" : "falha",
            error: message,
          });
        }
      }

      return {
        checkedAt: new Date().toISOString(),
        limit,
        status: summarizeValidationStatus(items),
        items,
      };
    },
  };
}
