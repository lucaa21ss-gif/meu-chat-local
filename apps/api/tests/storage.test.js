import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { createStorageService } from "../../../platform/fs/storage/storage-service.js";
import { createBackupArchive } from "../../../platform/fs/backup/backup-archive.js";
async function touchFile(filePath, content, mtimeMsOffset = 0) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  if (mtimeMsOffset !== 0) {
    const now = Date.now();
    const target = new Date(now + mtimeMsOffset);
    await fs.utimes(filePath, target, target);
  }
}

test("storage service reporta consumo por tipo", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "storage-usage-"));
  try {
    const dbPath = path.join(tempDir, "chat.db");
    await touchFile(dbPath, "db-content");
    await touchFile(path.join(tempDir, "uploads", "a.bin"), "12345");
    await touchFile(path.join(tempDir, "documents", "d.txt"), "1234567890");
    await touchFile(path.join(tempDir, "backups", "b.tgz"), "1234");

    const service = createStorageService({ baseDir: tempDir, dbPath });
    const usage = await service.getUsage();

    assert.equal(usage.dbBytes > 0, true);
    assert.equal(usage.uploadsBytes > 0, true);
    assert.equal(usage.documentsBytes > 0, true);
    assert.equal(usage.backupsBytes > 0, true);
    assert.equal(
      usage.totalBytes,
      usage.dbBytes + usage.uploadsBytes + usage.documentsBytes + usage.backupsBytes,
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("storage service cleanup respeita olderThanDays e maxDeleteMb", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "storage-clean-"));
  try {
    const dbPath = path.join(tempDir, "chat.db");
    await touchFile(dbPath, "db");

    // Backups antigos no mesmo periodo (candidatos a rotacao)
    await touchFile(
      path.join(tempDir, "backups", "meu-chat-local-backup-old-a.tgz"),
      "1234567890",
      -40 * 24 * 60 * 60 * 1000,
    );
    await touchFile(
      path.join(tempDir, "backups", "meu-chat-local-backup-old-b.tgz"),
      "1234567890",
      -42 * 24 * 60 * 60 * 1000,
    );
    // Arquivo recente: 1 dia atras (deve ser preservado por curto prazo)
    await touchFile(
      path.join(tempDir, "backups", "meu-chat-local-backup-new.tgz"),
      "1234567890",
      -1 * 24 * 60 * 60 * 1000,
    );

    const service = createStorageService({ baseDir: tempDir, dbPath });

    const dryRun = await service.cleanup({
      target: "backups",
      olderThanDays: 30,
      maxDeleteMb: 1,
      execute: false,
    });

    assert.equal(dryRun.mode, "dry-run");
    assert.equal(dryRun.filesCount, 1);
    assert.equal(dryRun.files[0].name.includes("old-"), true);

    const execute = await service.cleanup({
      target: "backups",
      olderThanDays: 30,
      maxDeleteMb: 1,
      execute: true,
    });

    assert.equal(execute.mode, "execute");
    assert.equal(execute.filesCount, 1);

    const remaining = await fs.readdir(path.join(tempDir, "backups"));
    assert.equal(remaining.includes("meu-chat-local-backup-new.tgz"), true);
    assert.equal(
      remaining.some((name) => name.includes("old-a") || name.includes("old-b")),
      true,
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("storage service cleanup protege ultimos backups validados", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "storage-clean-validated-"));
  try {
    const dbPath = path.join(tempDir, "chat.db");
    await touchFile(dbPath, "db");
    const backupDir = path.join(tempDir, "backups");

    async function createValidBackup(fileName, mtimeOffsetDays) {
      const backup = await createBackupArchive({
        dbPath,
        includeDirs: [],
        backupRoot: backupDir,
        createDbSnapshot: async (snapshotPath) => {
          await fs.writeFile(snapshotPath, `db-${fileName}`, "utf8");
        },
      });

      const targetPath = path.join(backupDir, fileName);
      await fs.writeFile(targetPath, backup.archiveBuffer);
      const targetDate = new Date(Date.now() - mtimeOffsetDays * 24 * 60 * 60 * 1000);
      await fs.utimes(targetPath, targetDate, targetDate);
      await fs.rm(backup.archivePath, { force: true });
    }

    await createValidBackup("meu-chat-local-backup-v1.tgz", 50);
    await createValidBackup("meu-chat-local-backup-v2.tgz", 51);
    await createValidBackup("meu-chat-local-backup-v3.tgz", 52);
    await createValidBackup("meu-chat-local-backup-v4.tgz", 53);

    const service = createStorageService({ baseDir: tempDir, dbPath });

    const dryRun = await service.cleanup({
      target: "backups",
      olderThanDays: 30,
      maxDeleteMb: 10,
      preserveValidatedBackups: 2,
      execute: false,
    });

    assert.equal(dryRun.retention.protectedValidatedCount >= 1, true);
    assert.equal(Array.isArray(dryRun.skipped), true);
    assert.equal(
      dryRun.skipped.some((item) => item.reason === "validated-recent"),
      true,
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
