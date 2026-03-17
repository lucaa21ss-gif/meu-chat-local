import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";

const dbModuleUrl = new URL("./db.js", import.meta.url);

async function loadDbModuleWithFreshCache() {
  return import(`${dbModuleUrl.href}?cacheBust=${Date.now()}-${Math.random()}`);
}

test("initDb aplica migrations e define versao esperada", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "chat-db-migration-"));
  const dbFile = path.join(tempDir, "chat.db");
  process.env.CHAT_DB_PATH = dbFile;

  try {
    const dbModule = await loadDbModuleWithFreshCache();
    await dbModule.initDb();

    const version = await dbModule.getSchemaVersion();
    assert.equal(version, 4);

    const chats = await dbModule.listChats();
    assert.equal(chats.some((chat) => chat.id === "default"), true);

    await dbModule.closeDb();
  } finally {
    delete process.env.CHAT_DB_PATH;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("initDb e idempotente com migrations versionadas", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "chat-db-idempotent-"));
  const dbFile = path.join(tempDir, "chat.db");
  process.env.CHAT_DB_PATH = dbFile;

  try {
    const dbModule = await loadDbModuleWithFreshCache();

    await dbModule.initDb();
    await dbModule.initDb();

    const version = await dbModule.getSchemaVersion();
    assert.equal(version, 4);

    await dbModule.appendMessage("default", "user", "teste de migracao");
    const messages = await dbModule.getMessages("default");
    assert.equal(messages.length > 0, true);

    await dbModule.closeDb();
  } finally {
    delete process.env.CHAT_DB_PATH;
    await rm(tempDir, { recursive: true, force: true });
  }
});
