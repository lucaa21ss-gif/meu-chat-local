import * as db from "../infra/db/db.js";

const STORE_METHOD_NAMES = [
  "initDb",
  "listChats",
  "createChat",
  "duplicateChat",
  "renameChat",
  "deleteChat",
  "setChatFavorite",
  "setChatArchived",
  "setChatTags",
  "setChatSystemPrompt",
  "getChatSystemPrompts",
  "ensureChat",
  "getMessages",
  "searchMessages",
  "appendAuditLog",
  "appendConfigVersion",
  "listAuditLogs",
  "listConfigVersions",
  "getConfigVersionById",
  "exportAuditLogs",
  "upsertRagDocument",
  "listRagDocuments",
  "searchDocumentChunks",
  "listUsers",
  "createUser",
  "renameUser",
  "setUserTheme",
  "setUserStorageLimit",
  "setUserRole",
  "setUserDefaultSystemPrompt",
  "deleteUser",
  "getUserById",
  "ensureUser",
  "getUiPreferences",
  "setUiPreferences",
  "appendMessage",
  "resetChat",
  "exportChatMarkdown",
  "exportChatJson",
  "importChatJson",
  "renameChatFromFirstMessage",
];

export function createStore(deps = {}) {
  return Object.fromEntries(
    STORE_METHOD_NAMES.map((methodName) => [
      methodName,
      deps[methodName] || db[methodName],
    ]),
  );
}

export function resolveDbPath(deps = {}) {
  return deps.dbPath || db.getDbPath();
}

export async function initStoreDb() {
  await db.initDb();
}
