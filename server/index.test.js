import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "./index.js";

function createMockStore() {
  const chats = new Map([
    [
      "default",
      {
        id: "default",
        title: "Conversa Principal",
        userId: "user-default",
        isFavorite: false,
        archivedAt: null,
        tags: [],
        systemPrompt: "",
      },
    ],
  ]);
  const messages = new Map([["default", []]]);
  const ragDocumentsByChat = new Map();
  const users = new Map([
    [
      "user-default",
      {
        id: "user-default",
        name: "padrao",
        defaultSystemPrompt: "",
        theme: "system",
        role: "admin",
        storageLimitMb: 512,
      },
    ],
    [
      "user-operator",
      {
        id: "user-operator",
        name: "operador",
        defaultSystemPrompt: "",
        theme: "system",
        role: "operator",
        storageLimitMb: 512,
      },
    ],
    [
      "user-viewer",
      {
        id: "user-viewer",
        name: "visualizador",
        defaultSystemPrompt: "",
        theme: "system",
        role: "viewer",
        storageLimitMb: 512,
      },
    ],
  ]);
  const auditLogs = [];
  let auditId = 0;
  const configVersions = [];
  let configVersionId = 0;

  const ensureMessages = (chatId) => {
    if (!messages.has(chatId)) messages.set(chatId, []);
    return messages.get(chatId);
  };

  const ensureRagDocs = (chatId) => {
    if (!ragDocumentsByChat.has(chatId)) ragDocumentsByChat.set(chatId, []);
    return ragDocumentsByChat.get(chatId);
  };

  return {
    initDb: async () => {},
    listUsers: async () => Array.from(users.values()),
    createUser: async (id, name, role = "operator") => {
      if ([...users.values()].some((u) => u.name === name)) {
        throw new Error("Nome de perfil ja existe");
      }
      const user = {
        id,
        name,
        defaultSystemPrompt: "",
        theme: "system",
        role,
        storageLimitMb: 512,
      };
      users.set(id, user);
      return user;
    },
    renameUser: async (userId, name) => {
      if (!users.has(userId)) return null;
      if ([...users.values()].some((u) => u.name === name && u.id !== userId)) {
        throw new Error("Nome de perfil ja existe");
      }
      users.set(userId, { ...users.get(userId), name });
      return users.get(userId);
    },
    deleteUser: async (userId) => {
      if (userId === "user-default")
        throw new Error("Perfil padrao nao pode ser excluido");
      const existed = users.delete(userId);
      for (const [chatId, chat] of chats.entries()) {
        if ((chat.userId || "user-default") === userId) {
          chats.delete(chatId);
          messages.delete(chatId);
          ragDocumentsByChat.delete(chatId);
        }
      }
      return existed;
    },
    getUserById: async (userId) => users.get(userId) || null,
    setUserRole: async (userId, role) => {
      if (!users.has(userId)) return null;
      users.set(userId, {
        ...users.get(userId),
        role,
      });
      return { id: userId, role };
    },
    ensureUser: async (id, name, role = "operator") => {
      if (!users.has(id)) users.set(id, { id, name, role });
    },
    listChats: async (userId, opts = {}) => {
      const { favoriteOnly = false, showArchived = false, tag = null } = opts;
      const all = Array.from(chats.values());
      return all
        .filter((c) =>
          userId ? (c.userId || "user-default") === userId : true,
        )
        .filter((c) => (showArchived ? !!c.archivedAt : !c.archivedAt))
        .filter((c) => (favoriteOnly ? !!c.isFavorite : true))
        .filter((c) =>
          tag
            ? (c.tags || []).some(
                (t) => String(t).toLowerCase() === String(tag).toLowerCase(),
              )
            : true,
        )
        .map(({ id, title, isFavorite, archivedAt, tags, systemPrompt }) => ({
          id,
          title,
          isFavorite: !!isFavorite,
          archivedAt: archivedAt || null,
          tags: Array.isArray(tags) ? tags : [],
          systemPrompt: systemPrompt || "",
        }));
    },
    createChat: async (id, title, userId = "user-default") => {
      const chat = {
        id,
        title,
        userId,
        isFavorite: false,
        archivedAt: null,
        tags: [],
        systemPrompt: "",
      };
      chats.set(id, chat);
      ensureMessages(id);
      return {
        id,
        title,
        isFavorite: false,
        archivedAt: null,
        tags: [],
        systemPrompt: "",
      };
    },
    duplicateChat: async (sourceChatId, targetChatId, title, options = {}) => {
      if (!chats.has(sourceChatId)) return null;
      const source = chats.get(sourceChatId);
      const copied = ensureMessages(sourceChatId)
        .filter((msg) => (options.userOnly ? msg.role === "user" : true))
        .map((msg) => ({ ...msg }));
      chats.set(targetChatId, {
        id: targetChatId,
        title: title || `${source.title} (copia)`,
        userId: source.userId || "user-default",
        isFavorite: false,
        archivedAt: null,
        tags: [],
      });
      messages.set(targetChatId, copied);
      return chats.get(targetChatId);
    },
    renameChat: async (chatId, title) => {
      if (!chats.has(chatId)) return null;
      chats.set(chatId, { ...chats.get(chatId), title });
      return chats.get(chatId);
    },
    deleteChat: async (chatId) => {
      const existed = chats.delete(chatId);
      messages.delete(chatId);
      return existed;
    },
    setChatFavorite: async (chatId, isFavorite) => {
      if (!chats.has(chatId)) return null;
      chats.set(chatId, { ...chats.get(chatId), isFavorite: !!isFavorite });
      return { id: chatId, isFavorite: !!isFavorite };
    },
    setChatArchived: async (chatId, archived) => {
      if (!chats.has(chatId)) return null;
      const archivedAt = archived ? new Date().toISOString() : null;
      chats.set(chatId, { ...chats.get(chatId), archivedAt });
      return { id: chatId, archivedAt };
    },
    setChatTags: async (chatId, tags) => {
      if (!chats.has(chatId)) return null;
      chats.set(chatId, {
        ...chats.get(chatId),
        tags: Array.isArray(tags) ? tags : [],
      });
      return { id: chatId, tags: Array.isArray(tags) ? tags : [] };
    },
    setChatSystemPrompt: async (chatId, systemPrompt) => {
      if (!chats.has(chatId)) return null;
      chats.set(chatId, {
        ...chats.get(chatId),
        systemPrompt: String(systemPrompt || ""),
      });
      return { id: chatId, systemPrompt: String(systemPrompt || "") };
    },
    getChatSystemPrompts: async (chatId) => {
      if (!chats.has(chatId)) return null;
      const chat = chats.get(chatId);
      const user = users.get(chat.userId || "user-default") || {
        defaultSystemPrompt: "",
      };
      return {
        id: chat.id,
        userId: chat.userId || "user-default",
        systemPrompt: chat.systemPrompt || "",
        defaultSystemPrompt: user.defaultSystemPrompt || "",
      };
    },
    setUserDefaultSystemPrompt: async (userId, defaultSystemPrompt) => {
      if (!users.has(userId)) return null;
      users.set(userId, {
        ...users.get(userId),
        defaultSystemPrompt: String(defaultSystemPrompt || ""),
      });
      return {
        id: userId,
        defaultSystemPrompt: String(defaultSystemPrompt || ""),
      };
    },
    setUserTheme: async (userId, theme) => {
      if (!users.has(userId)) return null;
      const safeTheme = ["light", "dark", "system"].includes(theme)
        ? theme
        : "system";
      users.set(userId, {
        ...users.get(userId),
        theme: safeTheme,
      });
      return { id: userId, theme: safeTheme };
    },
    setUserStorageLimit: async (userId, storageLimitMb) => {
      if (!users.has(userId)) return null;
      const parsed = Number.parseInt(storageLimitMb, 10);
      const safeLimit = Number.isFinite(parsed)
        ? Math.min(10240, Math.max(50, parsed))
        : 512;
      users.set(userId, {
        ...users.get(userId),
        storageLimitMb: safeLimit,
      });
      return { id: userId, storageLimitMb: safeLimit };
    },
    ensureChat: async (chatId, title, userId = "user-default") => {
      if (!chats.has(chatId)) {
        chats.set(chatId, { id: chatId, title: "Nova conversa", userId });
      }
      ensureMessages(chatId);
    },
    getMessages: async (chatId) => [...ensureMessages(chatId)],
    searchMessages: async (chatId, query, options = {}) => {
      const normalized = String(query || "")
        .trim()
        .toLowerCase();
      if (!normalized) {
        return { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      }

      const safeLimit = Math.min(
        100,
        Math.max(1, Number.parseInt(options.limit, 10) || 20),
      );
      const safePage = Math.max(1, Number.parseInt(options.page, 10) || 1);
      const safeRole =
        options.role === "user" || options.role === "assistant"
          ? options.role
          : null;
      const safeFrom = options.from ? new Date(options.from) : null;
      const safeTo = options.to ? new Date(options.to) : null;

      const filtered = ensureMessages(chatId)
        .filter((msg) =>
          String(msg.content || "")
            .toLowerCase()
            .includes(normalized),
        )
        .filter((msg) => {
          if (safeRole && msg.role !== safeRole) return false;
          const createdAt = new Date(msg.createdAt || Date.now());
          if (safeFrom && createdAt < safeFrom) return false;
          if (safeTo && createdAt > safeTo) return false;
          return true;
        })
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt || new Date().toISOString(),
        }));

      const total = filtered.length;
      const start = (safePage - 1) * safeLimit;
      const items = filtered.slice(start, start + safeLimit);
      const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

      return {
        items,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages,
      };
    },
    appendAuditLog: async (userId, eventType, meta = {}) => {
      auditId += 1;
      const item = {
        id: auditId,
        userId: userId || null,
        eventType: String(eventType || "").trim(),
        meta: meta && typeof meta === "object" ? meta : {},
        createdAt: new Date().toISOString(),
      };
      auditLogs.unshift(item);
      return item;
    },
    appendConfigVersion: async (entry = {}) => {
      configVersionId += 1;
      const item = {
        id: configVersionId,
        configKey: String(entry.configKey || "").trim(),
        targetType: String(entry.targetType || "").trim(),
        targetId: entry.targetId == null ? null : String(entry.targetId),
        value: entry.value,
        actorUserId: entry.actorUserId || null,
        source: entry.source || "api",
        meta: entry.meta && typeof entry.meta === "object" ? entry.meta : {},
        createdAt: new Date().toISOString(),
      };
      configVersions.unshift(item);
      return item;
    },
    listConfigVersions: async (options = {}) => {
      const page = Math.max(1, Number.parseInt(options.page, 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(options.limit, 10) || 20),
      );
      const filtered = configVersions.filter((item) => {
        if (options.configKey && item.configKey !== options.configKey)
          return false;
        if (options.targetType && item.targetType !== options.targetType)
          return false;
        if (options.targetId && item.targetId !== options.targetId) return false;
        return true;
      });
      const total = filtered.length;
      const totalPages = total ? Math.ceil(total / limit) : 0;
      const offset = (page - 1) * limit;
      return {
        items: filtered.slice(offset, offset + limit),
        page,
        limit,
        total,
        totalPages,
      };
    },
    getConfigVersionById: async (versionId) => {
      const id = Number.parseInt(versionId, 10);
      if (!Number.isFinite(id) || id < 1) return null;
      return configVersions.find((item) => item.id === id) || null;
    },
    listAuditLogs: async (options = {}) => {
      const page = Math.max(1, Number.parseInt(options.page, 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(options.limit, 10) || 20),
      );
      const filtered = auditLogs.filter((item) => {
        if (options.userId && item.userId !== options.userId) return false;
        if (options.eventType && item.eventType !== options.eventType)
          return false;
        if (options.from && new Date(item.createdAt) < new Date(options.from))
          return false;
        if (options.to && new Date(item.createdAt) > new Date(options.to))
          return false;
        return true;
      });
      const total = filtered.length;
      const totalPages = total ? Math.ceil(total / limit) : 0;
      const offset = (page - 1) * limit;
      return {
        items: filtered.slice(offset, offset + limit),
        page,
        limit,
        total,
        totalPages,
      };
    },
    exportAuditLogs: async (options = {}) => {
      const result = await (async () => {
        const page = 1;
        const limit = 1000;
        const list = await Promise.resolve().then(() => {
          return auditLogs.filter((item) => {
            if (options.userId && item.userId !== options.userId) return false;
            if (options.eventType && item.eventType !== options.eventType)
              return false;
            return true;
          });
        });
        return { items: list.slice(0, limit), page, limit };
      })();
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        filters: {
          userId: options.userId || null,
          eventType: options.eventType || null,
          from: options.from || null,
          to: options.to || null,
        },
        logs: result.items,
      };
    },
    upsertRagDocument: async (chatId, name, content) => {
      const docs = ensureRagDocs(chatId);
      const normalizedName = String(name || "").trim();
      const normalizedContent = String(content || "").trim();

      let doc = docs.find((item) => item.name === normalizedName);
      if (!doc) {
        doc = {
          id: docs.length + 1,
          name: normalizedName,
          content: normalizedContent,
          updatedAt: new Date().toISOString(),
        };
        docs.push(doc);
      } else {
        doc.content = normalizedContent;
        doc.updatedAt = new Date().toISOString();
      }

      const chunkCount = Math.max(1, Math.ceil(normalizedContent.length / 900));
      doc.chunkCount = chunkCount;

      return {
        id: doc.id,
        name: doc.name,
        updatedAt: doc.updatedAt,
        chunkCount,
      };
    },
    listRagDocuments: async (chatId) => {
      return ensureRagDocs(chatId).map((doc) => ({
        id: doc.id,
        name: doc.name,
        updatedAt: doc.updatedAt,
        chunkCount: doc.chunkCount || 1,
      }));
    },
    searchDocumentChunks: async (chatId, query, options = {}) => {
      const q = String(query || "")
        .trim()
        .toLowerCase();
      if (!q) return [];
      const limit = Math.min(
        8,
        Math.max(1, Number.parseInt(options.limit, 10) || 4),
      );
      const docs = ensureRagDocs(chatId);
      const tokens = (q.match(/[a-z0-9]+/gi) || [])
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.length >= 3);

      const matches = [];
      for (const doc of docs) {
        const content = String(doc.content || "").toLowerCase();
        const hasMatch = (tokens.length ? tokens : [q]).some((token) =>
          content.includes(token),
        );
        if (!hasMatch) continue;

        matches.push({
          documentName: doc.name,
          chunkIndex: 1,
          snippet: doc.content.slice(0, 220),
          content: doc.content,
        });
      }

      return matches.slice(0, limit);
    },
    appendMessage: async (chatId, role, content, images = []) => {
      ensureMessages(chatId).push({ role, content, images });
    },
    resetChat: async (chatId) => {
      messages.set(chatId, []);
    },
    exportChatMarkdown: async (chatId) => {
      if (!chats.has(chatId)) return null;
      const parts = ["# Export"];
      for (const msg of ensureMessages(chatId)) {
        parts.push(`## ${msg.role}`);
        parts.push(msg.content);
      }
      return parts.join("\n");
    },
    exportChatJson: async (chatId) => {
      if (!chats.has(chatId)) return null;
      const chat = chats.get(chatId);
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        chat: {
          id: chat.id,
          title: chat.title,
          userId: chat.userId || "user-default",
          isFavorite: !!chat.isFavorite,
          archivedAt: chat.archivedAt || null,
          tags: chat.tags || [],
          messages: ensureMessages(chatId).map((m) => ({
            role: m.role,
            content: m.content,
            images: m.images || [],
            createdAt: m.createdAt || new Date().toISOString(),
          })),
        },
      };
    },
    importChatJson: async (payload, opts = {}) => {
      const chat = payload?.chat;
      if (!chat) throw new Error("Payload invalido");
      const rawId = String(chat.id || "").trim();
      const chatId =
        !rawId || chats.has(rawId) || opts.forceNew
          ? `chat-imp-${Date.now()}`
          : rawId;
      chats.set(chatId, {
        id: chatId,
        title: chat.title || "Importada",
        userId: chat.userId || "user-default",
        isFavorite: !!chat.isFavorite,
        archivedAt: chat.archivedAt || null,
        tags: chat.tags || [],
      });
      messages.set(
        chatId,
        (chat.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
          images: m.images || [],
        })),
      );
      return {
        id: chatId,
        title: chat.title || "Importada",
        userId: chat.userId || "user-default",
      };
    },
    renameChatFromFirstMessage: async (chatId, text) => {
      if (!chats.has(chatId)) return;
      const current = chats.get(chatId);
      if (
        current.title === "Nova conversa" ||
        current.title === "Conversa Principal"
      ) {
        chats.set(chatId, { ...current, title: text.slice(0, 24) });
      }
    },
  };
}

function createMockChatClient() {
  return {
    chat: async ({ stream }) => {
      if (!stream) {
        return { message: { content: "resposta teste" } };
      }

      async function* generator() {
        yield { message: { content: "resposta " } };
        yield { message: { content: "stream" } };
      }

      return generator();
    },
  };
}

test("POST /api/chats cria chat e GET /api/chats lista", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const created = await request(app)
    .post("/api/chats")
    .send({ id: "tab-1", title: "Minha Aba" })
    .expect(201);

  assert.equal(created.body.chat.id, "tab-1");

  const listed = await request(app).get("/api/chats").expect(200);

  assert.equal(Array.isArray(listed.body.chats), true);
  assert.equal(
    listed.body.chats.some((chat) => chat.id === "tab-1"),
    true,
  );
});

test("PATCH e DELETE /api/chats/:chatId funcionam", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/chats")
    .send({ id: "tab-2", title: "Aba antiga" })
    .expect(201);

  const renamed = await request(app)
    .patch("/api/chats/tab-2")
    .send({ title: "Aba nova" })
    .expect(200);

  assert.equal(renamed.body.chat.title, "Aba nova");

  await request(app).delete("/api/chats/tab-2").expect(200);

  const listed = await request(app).get("/api/chats").expect(200);
  assert.equal(
    listed.body.chats.some((chat) => chat.id === "tab-2"),
    false,
  );
});

test("PATCH /favorite, /archive e /tags atualiza metadados da conversa", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/chats")
    .send({ id: "tab-meta", title: "Aba Meta" })
    .expect(201);

  const favorite = await request(app)
    .patch("/api/chats/tab-meta/favorite")
    .send({ isFavorite: true })
    .expect(200);
  assert.equal(favorite.body.chat.isFavorite, true);

  const tags = await request(app)
    .patch("/api/chats/tab-meta/tags")
    .send({ tags: ["estudo", "importante"] })
    .expect(200);
  assert.deepEqual(tags.body.chat.tags, ["estudo", "importante"]);

  const archived = await request(app)
    .patch("/api/chats/tab-meta/archive")
    .send({ archived: true })
    .expect(200);
  assert.equal(typeof archived.body.chat.archivedAt, "string");
});

test("GET /api/chats aplica filtros favorite, archived e tag", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/chats")
    .send({ id: "tab-filtro", title: "Aba Filtro" })
    .expect(201);

  await request(app)
    .patch("/api/chats/tab-filtro/favorite")
    .send({ isFavorite: true })
    .expect(200);

  await request(app)
    .patch("/api/chats/tab-filtro/tags")
    .send({ tags: ["trabalho"] })
    .expect(200);

  const favorites = await request(app)
    .get("/api/chats?favorite=true")
    .expect(200);
  assert.equal(
    favorites.body.chats.some((chat) => chat.id === "tab-filtro"),
    true,
  );

  await request(app)
    .patch("/api/chats/tab-filtro/archive")
    .send({ archived: true })
    .expect(200);

  const archived = await request(app)
    .get("/api/chats?archived=true")
    .expect(200);
  assert.equal(
    archived.body.chats.some((chat) => chat.id === "tab-filtro"),
    true,
  );

  const byTag = await request(app)
    .get("/api/chats?archived=true&tag=trabalho")
    .expect(200);
  assert.equal(byTag.body.chats.length >= 1, true);
});

test("telemetria opt-in habilita, coleta e desabilita", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const initial = await request(app).get("/api/telemetry").expect(200);
  assert.equal(initial.body.enabled, false);

  await request(app)
    .patch("/api/telemetry")
    .send({ enabled: true })
    .expect(200);

  await request(app).get("/api/chats").expect(200);
  await request(app).get("/api/chats/default/messages").expect(200);

  const enabledStats = await request(app).get("/api/telemetry").expect(200);
  assert.equal(enabledStats.body.enabled, true);
  assert.equal(Array.isArray(enabledStats.body.stats), true);
  assert.equal(enabledStats.body.stats.length >= 1, true);

  await request(app)
    .patch("/api/telemetry")
    .send({ enabled: false })
    .expect(200);

  const disabled = await request(app).get("/api/telemetry").expect(200);
  assert.equal(disabled.body.enabled, false);
  assert.equal(disabled.body.stats.length, 0);
});

test("POST /api/chats/:chatId/duplicate clona historico da conversa", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/chat")
    .send({ chatId: "default", message: "mensagem original" })
    .expect(200);

  const duplicated = await request(app)
    .post("/api/chats/default/duplicate")
    .send({ id: "tab-copy", title: "Copia da principal" })
    .expect(201);

  assert.equal(duplicated.body.chat.id, "tab-copy");

  const messages = await request(app)
    .get("/api/chats/tab-copy/messages")
    .expect(200);

  assert.equal(messages.body.messages.length >= 2, true);
  assert.equal(
    messages.body.messages.some((item) => item.content === "mensagem original"),
    true,
  );
});

test("POST /api/chats/:chatId/duplicate com userOnly copia apenas mensagens do usuario", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/chat")
    .send({ chatId: "default", message: "pergunta user only" })
    .expect(200);

  const duplicated = await request(app)
    .post("/api/chats/default/duplicate")
    .send({ id: "tab-copy-user", title: "Copia so usuario", userOnly: true })
    .expect(201);

  assert.equal(duplicated.body.chat.id, "tab-copy-user");

  const messages = await request(app)
    .get("/api/chats/tab-copy-user/messages")
    .expect(200);

  assert.equal(messages.body.messages.length >= 1, true);
  assert.equal(
    messages.body.messages.every((item) => item.role === "user"),
    true,
  );
});

test("POST /api/chat-stream escreve resposta e exporta markdown", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/chat-stream")
    .send({ chatId: "default", message: "ola" })
    .expect(200)
    .expect((res) => {
      assert.equal(res.text.includes("resposta stream"), true);
    });

  const exported = await request(app)
    .get("/api/chats/default/export")
    .expect(200);

  assert.equal(exported.text.includes("ola"), true);
  assert.equal(exported.text.includes("resposta stream"), true);
});

test("CORS bloqueia origem nao permitida por padrao", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const response = await request(app)
    .get("/api/chats")
    .set("Origin", "https://origem-maliciosa.com")
    .expect(403);

  assert.equal(
    String(response.body?.error || response.text || "").includes(
      "Origem nao permitida pelo CORS",
    ),
    true,
  );
});

test("GET /produto e /guia entregam paginas estaticas para usuario final", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const produto = await request(app).get("/produto").expect(200);
  const guia = await request(app).get("/guia").expect(200);
  const appPage = await request(app).get("/app").expect(200);

  assert.equal(produto.text.includes("Meu Chat Local"), true);
  assert.equal(produto.text.includes("Privacidade local"), true);
  assert.equal(guia.text.includes("Guia rapido"), true);
  assert.equal(appPage.text.includes("Assistente Inteligente"), true);
});

test("GET /api/chats/:chatId/search retorna matches por conteudo", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/chat")
    .send({ chatId: "default", message: "como melhorar observabilidade" })
    .expect(200);

  const response = await request(app)
    .get("/api/chats/default/search?q=observabilidade")
    .expect(200);

  assert.equal(Array.isArray(response.body.matches), true);
  assert.equal(response.body.matches.length > 0, true);
  assert.equal(
    response.body.matches.some((item) =>
      item.content.includes("observabilidade"),
    ),
    true,
  );
  assert.equal(response.body.pagination.total >= 1, true);
});

test("GET /api/chats/:chatId/search aplica paginacao e filtro por role", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/chat")
    .send({ chatId: "default", message: "filtro role um" })
    .expect(200);

  await request(app)
    .post("/api/chat")
    .send({ chatId: "default", message: "filtro role dois" })
    .expect(200);

  const response = await request(app)
    .get("/api/chats/default/search?q=filtro&role=user&limit=1&page=2")
    .expect(200);

  assert.equal(Array.isArray(response.body.matches), true);
  assert.equal(response.body.matches.length, 1);
  assert.equal(
    response.body.matches.every((item) => item.role === "user"),
    true,
  );
  assert.equal(response.body.pagination.page, 2);
  assert.equal(response.body.pagination.limit, 1);
  assert.equal(response.body.pagination.total >= 2, true);
  assert.equal(response.body.pagination.totalPages >= 2, true);
});

test("POST /api/chats/:chatId/rag/documents e GET listam documentos indexados", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const upload = await request(app)
    .post("/api/chats/default/rag/documents")
    .send({
      documents: [
        {
          name: "manual.md",
          content:
            "O produto oferece modo offline, privacidade local e busca no historico.",
        },
      ],
    })
    .expect(201);

  assert.equal(Array.isArray(upload.body.saved), true);
  assert.equal(upload.body.saved.length, 1);

  const listed = await request(app)
    .get("/api/chats/default/rag/documents")
    .expect(200);

  assert.equal(Array.isArray(listed.body.documents), true);
  assert.equal(listed.body.documents.length, 1);
  assert.equal(listed.body.documents[0].name, "manual.md");
});

test("GET /api/chats/:chatId/rag/search retorna trechos relevantes", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/chats/default/rag/documents")
    .send({
      documents: [
        {
          name: "politicas.txt",
          content:
            "A politica interna exige auditoria local e controle de acesso por times.",
        },
      ],
    })
    .expect(201);

  const response = await request(app)
    .get("/api/chats/default/rag/search?q=auditoria")
    .expect(200);

  assert.equal(Array.isArray(response.body.matches), true);
  assert.equal(response.body.matches.length >= 1, true);
  assert.equal(response.body.matches[0].documentName, "politicas.txt");
});

test("POST /api/chat com ragEnabled retorna citacoes", async () => {
  const app = createApp({
    chatClient: {
      chat: async ({ messages }) => ({
        message: {
          content: `Baseado no documento. ${messages[0]?.content?.includes("Fonte") ? "[Fonte: manual.md#trecho1]" : ""}`,
        },
      }),
    },
    ...createMockStore(),
  });

  await request(app)
    .post("/api/chats/default/rag/documents")
    .send({
      documents: [
        {
          name: "manual.md",
          content:
            "Este manual interno recomenda citar as fontes internas em respostas tecnicas.",
        },
      ],
    })
    .expect(201);

  const response = await request(app)
    .post("/api/chat")
    .send({
      chatId: "default",
      message: "Quais orientacoes do manual?",
      ragEnabled: true,
      ragTopK: 3,
    })
    .expect(200);

  assert.equal(Array.isArray(response.body.citations), true);
  assert.equal(response.body.citations.length >= 1, true);
  assert.equal(response.body.citations[0].documentName, "manual.md");
});

test("POST /api/chat usa fallback quando modelo primario falha", async () => {
  const app = createApp({
    ...createMockStore(),
    ollamaFallbackModel: "mistral",
    ollamaMaxAttempts: 2,
    ollamaRetryDelays: [0, 0],
    chatClient: {
      chat: async ({ model }) => {
        if (model === "meu-llama3") {
          throw new Error("modelo principal indisponivel");
        }
        return { message: { content: `ok via ${model}` } };
      },
    },
  });

  const response = await request(app)
    .post("/api/chat")
    .send({ chatId: "default", message: "teste fallback", model: "meu-llama3" })
    .expect(200);

  assert.equal(response.body.reply, "ok via mistral");
});

test("POST /api/chat-stream usa fallback quando modelo primario falha", async () => {
  const app = createApp({
    ...createMockStore(),
    ollamaFallbackModel: "mistral",
    ollamaMaxAttempts: 2,
    ollamaRetryDelays: [0, 0],
    chatClient: {
      chat: async ({ model, stream }) => {
        if (model === "meu-llama3") {
          throw new Error("modelo principal indisponivel");
        }

        if (!stream) {
          return { message: { content: `ok via ${model}` } };
        }

        async function* generator() {
          yield { message: { content: "stream fallback" } };
        }

        return generator();
      },
    },
  });

  const response = await request(app)
    .post("/api/chat-stream")
    .send({
      chatId: "default",
      message: "teste fallback stream",
      model: "meu-llama3",
    })
    .expect(200);

  assert.equal(response.text.includes("stream fallback"), true);
});

test("POST /api/chat retorna 504 quando inferencia excede timeout", async () => {
  const app = createApp({
    ...createMockStore(),
    ollamaTimeoutMs: 25,
    ollamaMaxAttempts: 1,
    chatClient: {
      chat: async () => new Promise(() => {}),
    },
  });

  const response = await request(app)
    .post("/api/chat")
    .send({ chatId: "default", message: "timeout test", model: "meu-llama3" })
    .expect(504);

  assert.equal(
    String(response.body?.error || response.text || "").includes(
      "Tempo limite excedido",
    ),
    true,
  );
});

test("GET /api/users e POST /api/users gerenciam perfis de usuario", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const listed = await request(app).get("/api/users").expect(200);
  assert.equal(Array.isArray(listed.body.users), true);
  assert.equal(
    listed.body.users.some((u) => u.name === "padrao"),
    true,
  );

  const created = await request(app)
    .post("/api/users")
    .send({ name: "alice" })
    .expect(201);

  assert.equal(created.body.user.name, "alice");
  assert.ok(created.body.user.id);

  const listed2 = await request(app).get("/api/users").expect(200);
  assert.equal(
    listed2.body.users.some((u) => u.name === "alice"),
    true,
  );
});

test("PATCH e DELETE /api/users/:userId renomeiam e excluem perfil", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const created = await request(app)
    .post("/api/users")
    .send({ name: "bob" })
    .expect(201);

  const userId = created.body.user.id;

  const renamed = await request(app)
    .patch(`/api/users/${userId}`)
    .send({ name: "bob-renomeado" })
    .expect(200);

  assert.equal(renamed.body.user.name, "bob-renomeado");

  await request(app).delete(`/api/users/${userId}`).expect(200);

  const listed = await request(app).get("/api/users").expect(200);
  assert.equal(
    listed.body.users.some((u) => u.name === "bob-renomeado"),
    false,
  );
});

test("abas criadas por usuarios diferentes ficam isoladas", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const carol = await request(app)
    .post("/api/users")
    .send({ name: "carol" })
    .expect(201);
  const carolId = carol.body.user.id;

  await request(app)
    .post("/api/chats")
    .send({ id: "chat-carol", title: "Aba Carol", userId: carolId })
    .expect(201);

  const carolChats = await request(app)
    .get(`/api/chats?userId=${carolId}`)
    .expect(200);
  const defaultChats = await request(app)
    .get("/api/chats?userId=user-default")
    .expect(200);

  assert.equal(
    carolChats.body.chats.some((c) => c.id === "chat-carol"),
    true,
  );
  assert.equal(
    defaultChats.body.chats.some((c) => c.id === "chat-carol"),
    false,
  );
});

test("GET /api/chats/:chatId/search valida query curta", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const response = await request(app)
    .get("/api/chats/default/search?q=a")
    .expect(400);

  assert.equal(
    String(response.body?.error || response.text || "").includes(
      "Parametro q deve ter pelo menos 2 caracteres",
    ),
    true,
  );
});

test("GET /api/health retorna healthy quando dependencias estao ok", async () => {
  const app = createApp({
    ...createMockStore(),
    healthProviders: {
      checkDb: async () => ({ status: "healthy", latencyMs: 3 }),
      checkModel: async () => ({
        status: "healthy",
        latencyMs: 5,
        ollama: "online",
      }),
      checkDisk: async () => ({
        status: "healthy",
        latencyMs: 1,
        totalBytes: 1000,
        freeBytes: 800,
        freePercent: 80,
      }),
    },
  });

  const response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.status, "healthy");
  assert.equal(response.body.ollama, "online");
  assert.equal(response.body.checks.db.status, "healthy");
  assert.equal(response.body.checks.model.status, "healthy");
  assert.equal(response.body.checks.disk.status, "healthy");
});

test("GET /api/health retorna degraded quando modelo esta offline", async () => {
  const app = createApp({
    ...createMockStore(),
    healthProviders: {
      checkDb: async () => ({ status: "healthy", latencyMs: 3 }),
      checkModel: async () => ({
        status: "degraded",
        latencyMs: 8,
        ollama: "offline",
        error: "connection refused",
      }),
      checkDisk: async () => ({
        status: "healthy",
        latencyMs: 1,
        totalBytes: 1000,
        freeBytes: 700,
        freePercent: 70,
      }),
    },
  });

  const response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.status, "degraded");
  assert.equal(response.body.ollama, "offline");
  assert.equal(response.body.alerts.length >= 1, true);
});

test("GET /api/health retorna unhealthy quando DB falha", async () => {
  const app = createApp({
    ...createMockStore(),
    healthProviders: {
      checkDb: async () => ({
        status: "unhealthy",
        latencyMs: 50,
        error: "db locked",
      }),
      checkModel: async () => ({
        status: "healthy",
        latencyMs: 2,
        ollama: "online",
      }),
      checkDisk: async () => ({
        status: "healthy",
        latencyMs: 1,
        totalBytes: 1000,
        freeBytes: 650,
        freePercent: 65,
      }),
    },
  });

  const response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.status, "unhealthy");
  assert.equal(response.body.checks.db.status, "unhealthy");
});

test("POST /api/chat-stream retorna erro padrao quando servico externo falha", async () => {
  const app = createApp({
    ...createMockStore(),
    ollamaMaxAttempts: 1,
    chatClient: {
      chat: async () => {
        throw new Error("ollama indisponivel");
      },
    },
  });

  const response = await request(app)
    .post("/api/chat-stream")
    .send({ chatId: "default", message: "falha externa", model: "meu-llama3" })
    .expect(500);

  assert.equal(
    String(response.body?.error || response.text || "").includes(
      "Erro no streaming",
    ),
    true,
  );
});

test("GET /api/chats/:chatId/export?format=json exporta conversa estruturada", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/chat")
    .send({ chatId: "default", message: "ola exportacao json" })
    .expect(200);

  const res = await request(app)
    .get("/api/chats/default/export?format=json")
    .expect(200);

  assert.equal(res.headers["content-type"].includes("application/json"), true);
  assert.equal(res.body.version, 1);
  assert.ok(res.body.exportedAt);
  assert.equal(res.body.chat.id, "default");
  assert.equal(Array.isArray(res.body.chat.messages), true);
  assert.equal(res.body.chat.messages.length >= 1, true);
});

test("GET /api/backup/export retorna arquivo compactado", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
    backupService: {
      createBackup: async () => ({
        fileName: "meu-chat-local-backup-test.tgz",
        archiveBuffer: Buffer.from("backup-teste"),
      }),
      restoreBackup: async () => ({ restored: true }),
    },
  });

  const response = await request(app).get("/api/backup/export").expect(200);
  assert.equal(response.headers["content-type"].includes("application/gzip"), true);
  assert.equal(
    response.headers["content-disposition"].includes("meu-chat-local-backup-test.tgz"),
    true,
  );
  const bodyText = Buffer.isBuffer(response.body)
    ? response.body.toString("utf8")
    : String(response.text || "");
  assert.equal(bodyText.includes("backup-teste"), true);
});

test("POST /api/backup/restore restaura backup valido", async () => {
  let capturedBuffer = null;
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
    backupService: {
      createBackup: async () => ({
        fileName: "x.tgz",
        archiveBuffer: Buffer.from("x"),
      }),
      restoreBackup: async (buffer) => {
        capturedBuffer = buffer;
        return { restored: true };
      },
    },
  });

  const payload = Buffer.from("arquivo-valido").toString("base64");
  const response = await request(app)
    .post("/api/backup/restore")
    .send({ archiveBase64: payload })
    .expect(200);

  assert.equal(response.body.ok, true);
  assert.equal(response.body.restore.restored, true);
  assert.equal(Buffer.isBuffer(capturedBuffer), true);
  assert.equal(capturedBuffer.toString("utf8"), "arquivo-valido");
});

test("POST /api/backup/restore rejeita payload invalido", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
    backupService: {
      createBackup: async () => ({
        fileName: "x.tgz",
        archiveBuffer: Buffer.from("x"),
      }),
      restoreBackup: async () => ({ restored: true }),
    },
  });

  await request(app)
    .post("/api/backup/restore")
    .send({ archiveBase64: "" })
    .expect(400);
});

test("POST /api/chats/import importa conversa e GET lista nova aba", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    chat: {
      id: "chat-import-test",
      title: "Conversa Importada",
      userId: "user-default",
      isFavorite: false,
      archivedAt: null,
      tags: ["teste"],
      messages: [
        {
          role: "user",
          content: "mensagem importada",
          images: [],
          createdAt: new Date().toISOString(),
        },
        {
          role: "assistant",
          content: "resposta importada",
          images: [],
          createdAt: new Date().toISOString(),
        },
      ],
    },
  };

  const imported = await request(app)
    .post("/api/chats/import")
    .send(payload)
    .expect(201);

  assert.ok(imported.body.chat.id);
  assert.equal(imported.body.chat.title, "Conversa Importada");

  const msgs = await request(app)
    .get(`/api/chats/${imported.body.chat.id}/messages`)
    .expect(200);

  assert.equal(Array.isArray(msgs.body.messages), true);
  assert.equal(msgs.body.messages.length, 2);
  assert.equal(msgs.body.messages[0].content, "mensagem importada");
});

test("POST /api/chats/import com id duplicado gera novo id", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    chat: {
      id: "default",
      title: "Tentativa de sobrescrever",
      userId: "user-default",
      isFavorite: false,
      archivedAt: null,
      tags: [],
      messages: [],
    },
  };

  const res = await request(app)
    .post("/api/chats/import")
    .send(payload)
    .expect(201);

  assert.notEqual(res.body.chat.id, "default");
});

test("GET /api/chats/export retorna lote JSON por userId", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/chats")
    .send({ id: "chat-lote-1", title: "Lote 1", userId: "user-default" })
    .expect(201);

  const response = await request(app)
    .get("/api/chats/export?userId=user-default")
    .expect(200);

  assert.equal(
    response.headers["content-type"].includes("application/json"),
    true,
  );
  assert.equal(response.body.version, 1);
  assert.equal(response.body.userId, "user-default");
  assert.equal(Array.isArray(response.body.chats), true);
  assert.equal(
    response.body.chats.some((chat) => chat.id === "chat-lote-1"),
    true,
  );
});

test("PATCH/GET /api/chats/:chatId/system-prompt atualiza prompt da conversa", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .patch("/api/chats/default/system-prompt")
    .send({ systemPrompt: "Responda sempre em bullets." })
    .expect(200);

  const response = await request(app)
    .get("/api/chats/default/system-prompt")
    .expect(200);

  assert.equal(response.body.chatId, "default");
  assert.equal(response.body.systemPrompt, "Responda sempre em bullets.");
});

test("PATCH /api/users/:userId/system-prompt-default atualiza prompt padrao", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const response = await request(app)
    .patch("/api/users/user-default/system-prompt-default")
    .send({ defaultSystemPrompt: "Fale em portugues do Brasil." })
    .expect(200);

  assert.equal(response.body.user.id, "user-default");
  assert.equal(
    response.body.user.defaultSystemPrompt,
    "Fale em portugues do Brasil.",
  );
});

test("PATCH /api/users/:userId/theme atualiza tema do perfil", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const response = await request(app)
    .patch("/api/users/user-default/theme")
    .send({ theme: "dark" })
    .expect(200);

  assert.equal(response.body.user.id, "user-default");
  assert.equal(response.body.user.theme, "dark");
});

test("PATCH /api/users/:userId/storage-limit atualiza limite por perfil", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const response = await request(app)
    .patch("/api/users/user-default/storage-limit")
    .send({ storageLimitMb: 1024 })
    .expect(200);

  assert.equal(response.body.user.id, "user-default");
  assert.equal(response.body.user.storageLimitMb, 1024);
});

test("GET /api/storage/usage retorna consumo por tipo", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
    storageService: {
      getUsage: async () => ({
        dbBytes: 10,
        uploadsBytes: 20,
        documentsBytes: 30,
        backupsBytes: 40,
        totalBytes: 100,
      }),
      cleanup: async () => ({
        mode: "dry-run",
        files: [],
        filesCount: 0,
        estimatedFreedBytes: 0,
      }),
    },
  });

  const response = await request(app)
    .get("/api/storage/usage?userId=user-default")
    .expect(200);

  assert.equal(response.body.userId, "user-default");
  assert.equal(response.body.usage.dbBytes, 10);
  assert.equal(response.body.usage.uploadsBytes, 20);
  assert.equal(response.body.usage.documentsBytes, 30);
  assert.equal(response.body.usage.totalBytes, 100);
  assert.equal(response.body.limit.storageLimitMb, 512);
});

test("POST /api/storage/cleanup dry-run e execute", async () => {
  const calls = [];
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
    storageService: {
      getUsage: async () => ({
        dbBytes: 0,
        uploadsBytes: 0,
        documentsBytes: 0,
        backupsBytes: 0,
        totalBytes: 0,
      }),
      cleanup: async (payload) => {
        calls.push(payload);
        return {
          mode: payload.execute ? "execute" : "dry-run",
          target: payload.target,
          olderThanDays: payload.olderThanDays,
          files: [],
          filesCount: 0,
          estimatedFreedBytes: 0,
        };
      },
    },
  });

  const dryRun = await request(app)
    .post("/api/storage/cleanup")
    .send({
      mode: "dry-run",
      target: "backups",
      olderThanDays: 15,
      maxDeleteMb: 100,
    })
    .expect(200);

  assert.equal(dryRun.body.cleanup.mode, "dry-run");
  assert.equal(calls[0].execute, false);

  const execute = await request(app)
    .post("/api/storage/cleanup")
    .send({
      mode: "execute",
      target: "backups",
      olderThanDays: 15,
      maxDeleteMb: 100,
    })
    .expect(200);

  assert.equal(execute.body.cleanup.mode, "execute");
  assert.equal(calls[1].execute, true);
});

test("GET /api/audit/logs suporta paginacao e filtros", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/audit/profile-switch")
    .send({ userId: "user-default" })
    .expect(201);

  await request(app)
    .post("/api/chats/import")
    .send({
      version: 1,
      exportedAt: new Date().toISOString(),
      chat: {
        id: "audit-import",
        title: "Import audit",
        userId: "user-default",
        messages: [],
      },
    })
    .expect(201);

  const response = await request(app)
    .get("/api/audit/logs?eventType=chat.import&page=1&limit=5")
    .expect(200);

  assert.equal(Array.isArray(response.body.logs), true);
  assert.equal(response.body.logs.length >= 1, true);
  assert.equal(response.body.logs[0].eventType, "chat.import");
  assert.equal(response.body.pagination.page, 1);
});

test("GET /api/audit/export retorna JSON para download", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .post("/api/audit/profile-switch")
    .send({ userId: "user-default" })
    .expect(201);

  const response = await request(app)
    .get("/api/audit/export?userId=user-default")
    .expect(200);

  assert.equal(
    response.headers["content-type"].includes("application/json"),
    true,
  );
  assert.equal(response.body.version, 1);
  assert.equal(Array.isArray(response.body.logs), true);
});

test("acoes criticas registram auditoria automaticamente", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .get("/api/chats/default/export?format=json")
    .expect(200);

  const logs = await request(app)
    .get("/api/audit/logs?eventType=chat.export")
    .expect(200);

  assert.equal(logs.body.logs.length >= 1, true);
  assert.equal(logs.body.logs[0].eventType, "chat.export");
});

test("versionamento de configuracao lista historico com metadata e faz rollback idempotente", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .patch("/api/users/user-default/system-prompt-default")
    .set("x-user-id", "user-default")
    .send({ defaultSystemPrompt: "Prompt v1" })
    .expect(200);

  const listPromptVersions = await request(app)
    .get(
      "/api/config/versions?configKey=user.defaultSystemPrompt&targetType=user&targetId=user-default",
    )
    .set("x-user-id", "user-default")
    .expect(200);

  assert.equal(listPromptVersions.body.versions.length >= 1, true);
  assert.equal(
    listPromptVersions.body.versions[0].configKey,
    "user.defaultSystemPrompt",
  );
  assert.equal(listPromptVersions.body.versions[0].targetType, "user");
  assert.equal(listPromptVersions.body.versions[0].targetId, "user-default");
  assert.equal(listPromptVersions.body.versions[0].actorUserId, "user-default");
  assert.equal(listPromptVersions.body.versions[0].source, "api");
  assert.equal(!!listPromptVersions.body.versions[0].createdAt, true);

  await request(app)
    .patch("/api/users/user-default/storage-limit")
    .set("x-user-id", "user-default")
    .send({ storageLimitMb: 777 })
    .expect(200);

  await request(app)
    .patch("/api/users/user-default/storage-limit")
    .set("x-user-id", "user-default")
    .send({ storageLimitMb: 999 })
    .expect(200);

  const versionsResponse = await request(app)
    .get(
      "/api/config/versions?configKey=user.storageLimitMb&targetType=user&targetId=user-default",
    )
    .set("x-user-id", "user-default")
    .expect(200);

  const rollbackTarget = versionsResponse.body.versions.find(
    (item) => item.value === 777,
  );
  assert.equal(!!rollbackTarget, true);

  const rollback = await request(app)
    .post(`/api/config/versions/${rollbackTarget.id}/rollback`)
    .set("x-user-id", "user-default")
    .expect(200);

  assert.equal(rollback.body.changed, true);
  assert.equal(rollback.body.value, 777);

  const rollbackAgain = await request(app)
    .post(`/api/config/versions/${rollbackTarget.id}/rollback`)
    .set("x-user-id", "user-default")
    .expect(200);

  assert.equal(rollbackAgain.body.changed, false);

  const audit = await request(app)
    .get("/api/audit/logs?eventType=config.rollback")
    .set("x-user-id", "user-default")
    .expect(200);

  assert.equal(audit.body.logs.length >= 2, true);
  assert.equal(audit.body.logs[0].eventType, "config.rollback");
});

test("RBAC bloqueia backup para viewer e permite para admin", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
    backupService: {
      createBackup: async () => ({
        fileName: "rbac-test.tgz",
        sizeBytes: 10,
        archiveBuffer: Buffer.from("ok"),
      }),
      restoreBackup: async () => ({ restored: true }),
    },
  });

  await request(app)
    .get("/api/backup/export")
    .set("x-user-id", "user-viewer")
    .expect(403);

  await request(app)
    .get("/api/backup/export")
    .set("x-user-id", "user-default")
    .expect(200);
});

test("RBAC permite tema proprio e bloqueia update de role para nao-admin", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  await request(app)
    .patch("/api/users/user-viewer/theme")
    .set("x-user-id", "user-viewer")
    .send({ theme: "dark" })
    .expect(200);

  await request(app)
    .patch("/api/users/user-operator/role")
    .set("x-user-id", "user-viewer")
    .send({ role: "admin" })
    .expect(403);

  const response = await request(app)
    .patch("/api/users/user-operator/role")
    .set("x-user-id", "user-default")
    .send({ role: "viewer" })
    .expect(200);

  assert.equal(response.body.user.id, "user-operator");
  assert.equal(response.body.user.role, "viewer");
});

test("POST /api/chat injeta prompts de perfil e conversa no payload", async () => {
  let capturedMessages = [];
  const app = createApp({
    ...createMockStore(),
    chatClient: {
      chat: async ({ messages }) => {
        capturedMessages = messages;
        return { message: { content: "ok" } };
      },
    },
  });

  await request(app)
    .patch("/api/users/user-default/system-prompt-default")
    .send({ defaultSystemPrompt: "Prompt padrao perfil" })
    .expect(200);

  await request(app)
    .patch("/api/chats/default/system-prompt")
    .send({ systemPrompt: "Prompt da conversa" })
    .expect(200);

  await request(app)
    .post("/api/chat")
    .send({ chatId: "default", message: "Teste" })
    .expect(200);

  assert.equal(capturedMessages[0]?.role, "system");
  assert.equal(capturedMessages[0]?.content, "Prompt padrao perfil");
  assert.equal(capturedMessages[1]?.role, "system");
  assert.equal(capturedMessages[1]?.content, "Prompt da conversa");
});
