import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
import {
  createBackupArchive,
  restoreBackupArchive,
} from "./backup.js";

async function withTempDir(callback) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "chat-backup-test-"));
  try {
    await callback(dir);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
}

test("backup criptografado exporta e restaura com passphrase valida", async () => {
  await withTempDir(async (rootDir) => {
    const dbPath = path.join(rootDir, "chat.db");
    const backupRoot = path.join(rootDir, "backups");
    const uploadsDir = path.join(rootDir, "uploads");
    await fsp.mkdir(uploadsDir, { recursive: true });
    await fsp.writeFile(path.join(uploadsDir, "sample.txt"), "conteudo-original", "utf8");

    const backup = await createBackupArchive({
      dbPath,
      includeDirs: ["uploads"],
      backupRoot,
      passphrase: "senha-super-segura",
      createDbSnapshot: async (snapshotPath) => {
        await fsp.writeFile(snapshotPath, "db-original", "utf8");
      },
    });

    assert.equal(backup.isEncrypted, true);
    assert.equal(backup.fileName.endsWith(".tgz.enc"), true);

    await fsp.writeFile(dbPath, "db-corrompido", "utf8");
    await fsp.writeFile(path.join(uploadsDir, "sample.txt"), "conteudo-corrompido", "utf8");

    const restored = await restoreBackupArchive({
      archiveBuffer: backup.archiveBuffer,
      dbPath,
      includeDirs: ["uploads"],
      passphrase: "senha-super-segura",
      closeDb: async () => {},
      initDb: async () => {},
    });

    assert.equal(restored.restored, true);
    assert.equal(restored.encrypted, true);
    assert.equal(await fsp.readFile(dbPath, "utf8"), "db-original");
    assert.equal(
      await fsp.readFile(path.join(uploadsDir, "sample.txt"), "utf8"),
      "conteudo-original",
    );
  });
});

test("backup legado restaura sem passphrase", async () => {
  await withTempDir(async (rootDir) => {
    const dbPath = path.join(rootDir, "chat.db");
    const backupRoot = path.join(rootDir, "backups");

    const backup = await createBackupArchive({
      dbPath,
      includeDirs: [],
      backupRoot,
      createDbSnapshot: async (snapshotPath) => {
        await fsp.writeFile(snapshotPath, "db-legado", "utf8");
      },
    });

    await fsp.writeFile(dbPath, "db-atual", "utf8");

    const restored = await restoreBackupArchive({
      archiveBuffer: backup.archiveBuffer,
      dbPath,
      includeDirs: [],
      closeDb: async () => {},
      initDb: async () => {},
    });

    assert.equal(restored.encrypted, false);
    assert.equal(await fsp.readFile(dbPath, "utf8"), "db-legado");
  });
});

test("backup criptografado rejeita passphrase invalida", async () => {
  await withTempDir(async (rootDir) => {
    const dbPath = path.join(rootDir, "chat.db");
    const backupRoot = path.join(rootDir, "backups");

    const backup = await createBackupArchive({
      dbPath,
      includeDirs: [],
      backupRoot,
      passphrase: "senha-super-segura",
      createDbSnapshot: async (snapshotPath) => {
        await fsp.writeFile(snapshotPath, "db-seguro", "utf8");
      },
    });

    await assert.rejects(
      () =>
        restoreBackupArchive({
          archiveBuffer: backup.archiveBuffer,
          dbPath,
          includeDirs: [],
          passphrase: "senha-errada",
          closeDb: async () => {},
          initDb: async () => {},
        }),
      /Passphrase invalida para backup criptografado/,
    );
  });
});

test("backup criptografado exige passphrase no restore", async () => {
  await withTempDir(async (rootDir) => {
    const dbPath = path.join(rootDir, "chat.db");
    const backupRoot = path.join(rootDir, "backups");

    const backup = await createBackupArchive({
      dbPath,
      includeDirs: [],
      backupRoot,
      passphrase: "senha-super-segura",
      createDbSnapshot: async (snapshotPath) => {
        await fsp.writeFile(snapshotPath, "db-seguro", "utf8");
      },
    });

    await assert.rejects(
      () =>
        restoreBackupArchive({
          archiveBuffer: backup.archiveBuffer,
          dbPath,
          includeDirs: [],
          closeDb: async () => {},
          initDb: async () => {},
        }),
      /Backup criptografado: informe a passphrase/,
    );
  });
});
