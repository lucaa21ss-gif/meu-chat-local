import path from "node:path";
import { fileURLToPath } from "node:url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "chat.db");

let db;

function titleFromText(text = "") {
  const normalized = String(text).trim().replace(/\s+/g, " ");
  if (!normalized) return "Nova conversa";
  return normalized.length > 48 ? `${normalized.slice(0, 48)}...` : normalized;
}

export async function initDb() {
  if (db) return db;

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      images_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(chat_id) REFERENCES chats(id)
    );
  `);

  await ensureChat("default", "Conversa Principal");
  return db;
}

export async function ensureChat(id, title = "Nova conversa") {
  await initDb();
  await db.run(
    `INSERT INTO chats (id, title) VALUES (?, ?)
     ON CONFLICT(id) DO NOTHING`,
    [id, title],
  );
}

export async function listChats() {
  await initDb();
  return db.all(
    `SELECT id, title, created_at AS createdAt, updated_at AS updatedAt
     FROM chats
     ORDER BY datetime(updated_at) DESC`,
  );
}

export async function createChat(id, title) {
  await initDb();
  const safeTitle = titleFromText(title);
  await db.run(`INSERT INTO chats (id, title) VALUES (?, ?)`, [id, safeTitle]);

  return { id, title: safeTitle };
}

export async function duplicateChat(
  sourceChatId,
  targetChatId,
  title,
  options = {},
) {
  await initDb();

  const source = await db.get("SELECT id, title FROM chats WHERE id = ?", [
    sourceChatId,
  ]);
  if (!source) return null;

  const targetTitle = titleFromText(title || `${source.title} (copia)`);
  await db.run(`INSERT INTO chats (id, title) VALUES (?, ?)`, [
    targetChatId,
    targetTitle,
  ]);

  await db.run(
    options.userOnly
      ? `INSERT INTO messages (chat_id, role, content, images_json, created_at)
         SELECT ?, role, content, images_json, created_at
         FROM messages
         WHERE chat_id = ? AND role = 'user'
         ORDER BY id ASC`
      : `INSERT INTO messages (chat_id, role, content, images_json, created_at)
         SELECT ?, role, content, images_json, created_at
         FROM messages
         WHERE chat_id = ?
         ORDER BY id ASC`,
    [targetChatId, sourceChatId],
  );

  await db.run(`UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
    targetChatId,
  ]);

  return { id: targetChatId, title: targetTitle };
}

export async function renameChat(chatId, title) {
  await initDb();
  const safeTitle = titleFromText(title);
  const result = await db.run(
    `UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [safeTitle, chatId],
  );

  if (!result.changes) return null;
  return { id: chatId, title: safeTitle };
}

export async function deleteChat(chatId) {
  await initDb();

  await db.run("DELETE FROM messages WHERE chat_id = ?", [chatId]);
  const result = await db.run("DELETE FROM chats WHERE id = ?", [chatId]);

  if (chatId === "default") {
    await ensureChat("default", "Conversa Principal");
  }

  return result.changes > 0;
}

export async function renameChatFromFirstMessage(chatId, text) {
  await initDb();
  const targetTitle = titleFromText(text);
  const existing = await db.get("SELECT title FROM chats WHERE id = ?", [
    chatId,
  ]);
  if (!existing) return;
  if (
    existing.title !== "Nova conversa" &&
    existing.title !== "Conversa Principal"
  )
    return;

  await db.run(
    `UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [targetTitle, chatId],
  );
}

export async function getMessages(chatId) {
  await initDb();
  const rows = await db.all(
    `SELECT role, content, images_json AS imagesJson, created_at AS createdAt
     FROM messages
     WHERE chat_id = ?
     ORDER BY id ASC`,
    [chatId],
  );

  return rows.map((row) => ({
    role: row.role,
    content: row.content,
    images: row.imagesJson ? JSON.parse(row.imagesJson) : [],
    createdAt: row.createdAt,
  }));
}

export async function appendMessage(chatId, role, content, images = []) {
  await initDb();
  await ensureChat(chatId);

  const safeImages = Array.isArray(images) ? images : [];
  await db.run(
    `INSERT INTO messages (chat_id, role, content, images_json)
     VALUES (?, ?, ?, ?)`,
    [
      chatId,
      role,
      content,
      safeImages.length ? JSON.stringify(safeImages) : null,
    ],
  );

  await db.run(`UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
    chatId,
  ]);
}

export async function resetChat(chatId) {
  await initDb();
  await db.run("DELETE FROM messages WHERE chat_id = ?", [chatId]);
  await db.run("UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
    chatId,
  ]);
}

export async function exportChatMarkdown(chatId) {
  await initDb();
  const chat = await db.get("SELECT id, title FROM chats WHERE id = ?", [
    chatId,
  ]);
  if (!chat) return null;

  const messages = await getMessages(chatId);
  const lines = [
    `# ${chat.title}`,
    "",
    `ID: ${chat.id}`,
    `Gerado em: ${new Date().toISOString()}`,
    "",
  ];

  for (const message of messages) {
    lines.push(`## ${message.role === "user" ? "Usuario" : "IA"}`);
    lines.push("");
    lines.push(message.content || "_Sem conteudo_");
    if (message.images?.length) {
      lines.push("");
      lines.push(`Imagens anexadas: ${message.images.length}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
