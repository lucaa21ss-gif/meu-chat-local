import path from "node:path";
import { fileURLToPath } from "node:url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDbPath = path.join(__dirname, "chat.db");
const DB_SCHEMA_VERSION = 4;

let db;

function resolveDbPath() {
  return process.env.CHAT_DB_PATH || defaultDbPath;
}

function titleFromText(text = "") {
  const normalized = String(text).trim().replace(/\s+/g, " ");
  if (!normalized) return "Nova conversa";
  return normalized.length > 48 ? `${normalized.slice(0, 48)}...` : normalized;
}

function splitDocumentIntoChunks(text, maxChunkLength = 900, overlap = 120) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    let end = Math.min(normalized.length, cursor + maxChunkLength);

    if (end < normalized.length) {
      const breakAt = normalized.lastIndexOf("\n", end);
      if (breakAt > cursor + 160) {
        end = breakAt;
      }
    }

    const content = normalized.slice(cursor, end).trim();
    if (content) chunks.push(content);
    if (end >= normalized.length) break;

    cursor = Math.max(end - overlap, cursor + 1);
  }

  return chunks;
}

export async function initDb() {
  if (db) return db;

  db = await open({
    filename: resolveDbPath(),
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA journal_mode = WAL;");
  await runMigrations(db);

  await ensureUser("user-default", "padrao");
  await ensureChat("default", "Conversa Principal", "user-default");
  return db;
}

async function ensureMigrationsTable(connection) {
  await connection.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      version INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO schema_migrations (id, version)
    VALUES (1, 0)
    ON CONFLICT(id) DO NOTHING;
  `);
}

async function getCurrentSchemaVersion(connection) {
  const row = await connection.get(
    "SELECT version FROM schema_migrations WHERE id = 1",
  );
  return Number.parseInt(row?.version, 10) || 0;
}

async function setSchemaVersion(connection, version) {
  await connection.run(
    `UPDATE schema_migrations
     SET version = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [version],
  );
}

async function runMigrations(connection) {
  await ensureMigrationsTable(connection);

  const migrations = [
    {
      version: 1,
      up: async () => {
        await connection.exec(`
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
      },
    },
    {
      version: 2,
      up: async () => {
        await connection.exec(`
          CREATE INDEX IF NOT EXISTS idx_chats_updated_at
            ON chats(updated_at DESC);

          CREATE INDEX IF NOT EXISTS idx_messages_chat_id_id
            ON messages(chat_id, id);
        `);
      },
    },
    {
      version: 3,
      up: async () => {
        await connection.exec(`
          CREATE TABLE IF NOT EXISTS rag_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT NOT NULL,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(chat_id, name),
            FOREIGN KEY(chat_id) REFERENCES chats(id)
          );

          CREATE TABLE IF NOT EXISTS rag_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            chat_id TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(document_id) REFERENCES rag_documents(id),
            FOREIGN KEY(chat_id) REFERENCES chats(id)
          );

          CREATE INDEX IF NOT EXISTS idx_rag_documents_chat
            ON rag_documents(chat_id, updated_at DESC);

          CREATE INDEX IF NOT EXISTS idx_rag_chunks_chat
            ON rag_chunks(chat_id, document_id, chunk_index);
        `);
      },
    },
    {
      version: 4,
      up: async () => {
        await connection.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name)
          );

          INSERT INTO users (id, name)
          VALUES ('user-default', 'padrao')
          ON CONFLICT(id) DO NOTHING;

          ALTER TABLE chats ADD COLUMN user_id TEXT NOT NULL DEFAULT 'user-default';

          CREATE INDEX IF NOT EXISTS idx_chats_user_id
            ON chats(user_id, updated_at DESC);
        `);
      },
    },
  ];

  let currentVersion = await getCurrentSchemaVersion(connection);

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;
    await migration.up();
    await setSchemaVersion(connection, migration.version);
    currentVersion = migration.version;
  }

  if (currentVersion < DB_SCHEMA_VERSION) {
    throw new Error(
      `Schema desatualizado: esperado ${DB_SCHEMA_VERSION}, atual ${currentVersion}`,
    );
  }
}

export async function getSchemaVersion() {
  await initDb();
  return getCurrentSchemaVersion(db);
}

export async function closeDb() {
  if (!db) return;
  await db.close();
  db = undefined;
}

export async function ensureUser(id, name) {
  await initDb();
  await db.run(
    `INSERT INTO users (id, name) VALUES (?, ?)
     ON CONFLICT(id) DO NOTHING`,
    [id, name],
  );
}

export async function listUsers() {
  await initDb();
  return db.all(
    `SELECT id, name, created_at AS createdAt, updated_at AS updatedAt
     FROM users
     ORDER BY name ASC`,
  );
}

export async function createUser(id, name) {
  await initDb();
  const safeName = String(name || "").trim();
  if (!safeName) throw new Error("Nome do perfil obrigatorio");
  try {
    await db.run(`INSERT INTO users (id, name) VALUES (?, ?)`, [id, safeName]);
  } catch (err) {
    if (String(err?.message || "").includes("UNIQUE")) {
      throw new Error("Nome de perfil ja existe");
    }
    throw err;
  }
  return { id, name: safeName };
}

export async function renameUser(userId, name) {
  await initDb();
  const safeName = String(name || "").trim();
  if (!safeName) throw new Error("Nome do perfil obrigatorio");
  try {
    const result = await db.run(
      `UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [safeName, userId],
    );
    if (!result.changes) return null;
  } catch (err) {
    if (String(err?.message || "").includes("UNIQUE")) {
      throw new Error("Nome de perfil ja existe");
    }
    throw err;
  }
  return { id: userId, name: safeName };
}

export async function deleteUser(userId) {
  await initDb();
  if (userId === "user-default") {
    throw new Error("Perfil padrao nao pode ser excluido");
  }
  const chatRows = await db.all(
    "SELECT id FROM chats WHERE user_id = ?",
    [userId],
  );
  for (const { id: chatId } of chatRows) {
    const docRows = await db.all(
      "SELECT id FROM rag_documents WHERE chat_id = ?",
      [chatId],
    );
    for (const { id: docId } of docRows) {
      await db.run("DELETE FROM rag_chunks WHERE document_id = ?", [docId]);
    }
    await db.run("DELETE FROM rag_documents WHERE chat_id = ?", [chatId]);
    await db.run("DELETE FROM messages WHERE chat_id = ?", [chatId]);
  }
  await db.run("DELETE FROM chats WHERE user_id = ?", [userId]);
  const result = await db.run("DELETE FROM users WHERE id = ?", [userId]);
  return result.changes > 0;
}

export async function getUserById(userId) {
  await initDb();
  const row = await db.get(
    "SELECT id, name, created_at AS createdAt FROM users WHERE id = ?",
    [userId],
  );
  return row || null;
}

export async function ensureChat(id, title = "Nova conversa", userId = "user-default") {
  await initDb();
  await db.run(
    `INSERT INTO chats (id, title, user_id) VALUES (?, ?, ?)
     ON CONFLICT(id) DO NOTHING`,
    [id, title, userId],
  );
}

export async function listChats(userId) {
  await initDb();
  if (userId) {
    return db.all(
      `SELECT id, title, created_at AS createdAt, updated_at AS updatedAt
       FROM chats
       WHERE user_id = ?
       ORDER BY datetime(updated_at) DESC`,
      [userId],
    );
  }
  return db.all(
    `SELECT id, title, created_at AS createdAt, updated_at AS updatedAt
     FROM chats
     ORDER BY datetime(updated_at) DESC`,
  );
}

export async function createChat(id, title, userId = "user-default") {
  await initDb();
  const safeTitle = titleFromText(title);
  await db.run(
    `INSERT INTO chats (id, title, user_id) VALUES (?, ?, ?)`,
    [id, safeTitle, userId],
  );

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

export async function searchMessages(chatId, query, options = {}) {
  await initDb();

  const safeQuery = String(query || "").trim();
  if (!safeQuery) {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
  }

  const safeLimit = Math.min(
    100,
    Math.max(1, Number.parseInt(options.limit, 10) || 20),
  );
  const safePage = Math.max(1, Number.parseInt(options.page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;
  const safeRole =
    options.role === "user" || options.role === "assistant"
      ? options.role
      : null;
  const safeFrom = options.from ? String(options.from) : null;
  const safeTo = options.to ? String(options.to) : null;

  const likeQuery = `%${safeQuery}%`;
  const whereParts = [
    "chat_id = ?",
    "content LIKE ? COLLATE NOCASE",
  ];
  const whereParams = [chatId, likeQuery];

  if (safeRole) {
    whereParts.push("role = ?");
    whereParams.push(safeRole);
  }

  if (safeFrom) {
    whereParts.push("datetime(created_at) >= datetime(?)");
    whereParams.push(safeFrom);
  }

  if (safeTo) {
    whereParts.push("datetime(created_at) <= datetime(?)");
    whereParams.push(safeTo);
  }

  const whereClause = whereParts.join(" AND ");

  const totalRow = await db.get(
    `SELECT COUNT(*) AS total
     FROM messages
     WHERE ${whereClause}`,
    whereParams,
  );

  const total = Number.parseInt(totalRow?.total, 10) || 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const rows = await db.all(
    `SELECT role, content, created_at AS createdAt
     FROM messages
     WHERE ${whereClause}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...whereParams, safeLimit, offset],
  );

  return {
    items: rows.map((row) => ({
      role: row.role,
      content: row.content,
      createdAt: row.createdAt,
    })),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
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

export async function upsertRagDocument(chatId, name, content) {
  await initDb();
  await ensureChat(chatId);

  const safeName = String(name || "").trim();
  const safeContent = String(content || "").trim();
  if (!safeName || !safeContent) {
    throw new Error("Documento invalido");
  }

  await db.run(
    `INSERT INTO rag_documents (chat_id, name, content)
     VALUES (?, ?, ?)
     ON CONFLICT(chat_id, name)
     DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP`,
    [chatId, safeName, safeContent],
  );

  const document = await db.get(
    `SELECT id, name, updated_at AS updatedAt
     FROM rag_documents
     WHERE chat_id = ? AND name = ?`,
    [chatId, safeName],
  );

  const chunks = splitDocumentIntoChunks(safeContent);
  await db.run("DELETE FROM rag_chunks WHERE document_id = ?", [document.id]);

  for (let idx = 0; idx < chunks.length; idx += 1) {
    await db.run(
      `INSERT INTO rag_chunks (document_id, chat_id, chunk_index, content)
       VALUES (?, ?, ?, ?)`,
      [document.id, chatId, idx + 1, chunks[idx]],
    );
  }

  return {
    id: document.id,
    name: document.name,
    updatedAt: document.updatedAt,
    chunkCount: chunks.length,
  };
}

export async function listRagDocuments(chatId) {
  await initDb();

  const rows = await db.all(
    `SELECT d.id,
            d.name,
            d.updated_at AS updatedAt,
            COUNT(c.id) AS chunkCount
     FROM rag_documents d
     LEFT JOIN rag_chunks c ON c.document_id = d.id
     WHERE d.chat_id = ?
     GROUP BY d.id, d.name, d.updated_at
     ORDER BY datetime(d.updated_at) DESC`,
    [chatId],
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt,
    chunkCount: Number.parseInt(row.chunkCount, 10) || 0,
  }));
}

export async function searchDocumentChunks(chatId, query, options = {}) {
  await initDb();

  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return [];

  const limit = Math.min(
    8,
    Math.max(1, Number.parseInt(options.limit, 10) || 4),
  );
  const tokens = Array.from(
    new Set(
      (normalizedQuery.match(/[a-z0-9]+/gi) || [])
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.length >= 2)
        .slice(0, 8),
    ),
  );

  const searchTokens = tokens.length ? tokens : [normalizedQuery];
  const whereSearch = searchTokens
    .map(() => "LOWER(c.content) LIKE ?")
    .join(" OR ");
  const params = [chatId, ...searchTokens.map((token) => `%${token}%`)];

  const rows = await db.all(
    `SELECT c.id,
            c.chunk_index AS chunkIndex,
            c.content,
            d.name AS documentName
     FROM rag_chunks c
     INNER JOIN rag_documents d ON d.id = c.document_id
     WHERE c.chat_id = ?
       AND (${whereSearch})
     ORDER BY c.id DESC
     LIMIT 80`,
    params,
  );

  const ranked = rows
    .map((row) => {
      const content = String(row.content || "").toLowerCase();
      const score = searchTokens.reduce(
        (sum, token) => sum + (content.includes(token) ? 1 : 0),
        0,
      );

      return {
        documentName: row.documentName,
        chunkIndex: row.chunkIndex,
        content: row.content,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map((item) => ({
    documentName: item.documentName,
    chunkIndex: item.chunkIndex,
    snippet:
      item.content.length > 260
        ? `${item.content.slice(0, 260)}...`
        : item.content,
    content: item.content,
  }));
}
