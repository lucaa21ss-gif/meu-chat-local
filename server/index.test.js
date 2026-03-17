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
      },
    ],
  ]);
  const messages = new Map([["default", []]]);
  const ragDocumentsByChat = new Map();
  const users = new Map([
    ["user-default", { id: "user-default", name: "padrao" }],
  ]);

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
    createUser: async (id, name) => {
      if ([...users.values()].some((u) => u.name === name)) {
        throw new Error("Nome de perfil ja existe");
      }
      const user = { id, name };
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
    ensureUser: async (id, name) => {
      if (!users.has(id)) users.set(id, { id, name });
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
        .map(({ id, title, isFavorite, archivedAt, tags }) => ({
          id,
          title,
          isFavorite: !!isFavorite,
          archivedAt: archivedAt || null,
          tags: Array.isArray(tags) ? tags : [],
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
      };
      chats.set(id, chat);
      ensureMessages(id);
      return {
        id,
        title,
        isFavorite: false,
        archivedAt: null,
        tags: [],
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

test("GET /api/health retorna status do Ollama", async () => {
  const appOnline = createApp({
    ...createMockStore(),
    chatClient: { list: async () => ({ models: [] }) },
  });

  const online = await request(appOnline).get("/api/health").expect(200);
  assert.equal(online.body.ollama, "online");
  assert.equal(typeof online.body.latencyMs, "number");

  const appOffline = createApp({
    ...createMockStore(),
    chatClient: {
      list: async () => {
        throw new Error("connection refused");
      },
    },
  });

  const offline = await request(appOffline).get("/api/health").expect(200);
  assert.equal(offline.body.ollama, "offline");
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

  assert.equal(response.headers["content-type"].includes("application/json"), true);
  assert.equal(response.body.version, 1);
  assert.equal(response.body.userId, "user-default");
  assert.equal(Array.isArray(response.body.chats), true);
  assert.equal(response.body.chats.some((chat) => chat.id === "chat-lote-1"), true);
});
