import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { createStorageService } from "./storage.js";

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

    // Arquivo antigo: 40 dias atras
    await touchFile(
      path.join(tempDir, "backups", "old.tgz"),
      "1234567890",
      -40 * 24 * 60 * 60 * 1000,
    );
    // Arquivo recente: 1 dia atras
    await touchFile(
      path.join(tempDir, "backups", "new.tgz"),
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
    assert.equal(dryRun.files[0].name, "old.tgz");

    const execute = await service.cleanup({
      target: "backups",
      olderThanDays: 30,
      maxDeleteMb: 1,
      execute: true,
    });

    assert.equal(execute.mode, "execute");
    assert.equal(execute.filesCount, 1);

    const remaining = await fs.readdir(path.join(tempDir, "backups"));
    assert.equal(remaining.includes("new.tgz"), true);
    assert.equal(remaining.includes("old.tgz"), false);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
