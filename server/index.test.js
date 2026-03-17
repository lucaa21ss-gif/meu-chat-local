import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "./index.js";

function createMockStore() {
  const chats = new Map([
    ["default", { id: "default", title: "Conversa Principal" }],
  ]);
  const messages = new Map([["default", []]]);

  const ensureMessages = (chatId) => {
    if (!messages.has(chatId)) messages.set(chatId, []);
    return messages.get(chatId);
  };

  return {
    initDb: async () => {},
    listChats: async () => Array.from(chats.values()),
    createChat: async (id, title) => {
      const chat = { id, title };
      chats.set(id, chat);
      ensureMessages(id);
      return chat;
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
    ensureChat: async (chatId) => {
      if (!chats.has(chatId)) {
        chats.set(chatId, { id: chatId, title: "Nova conversa" });
      }
      ensureMessages(chatId);
    },
    getMessages: async (chatId) => [...ensureMessages(chatId)],
    searchMessages: async (chatId, query, options = {}) => {
      const normalized = String(query || '').trim().toLowerCase();
      if (!normalized) {
        return { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      }

      const safeLimit = Math.min(100, Math.max(1, Number.parseInt(options.limit, 10) || 20));
      const safePage = Math.max(1, Number.parseInt(options.page, 10) || 1);
      const safeRole = options.role === 'user' || options.role === 'assistant' ? options.role : null;
      const safeFrom = options.from ? new Date(options.from) : null;
      const safeTo = options.to ? new Date(options.to) : null;

      const filtered = ensureMessages(chatId)
        .filter((msg) => String(msg.content || '').toLowerCase().includes(normalized))
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
    .post('/api/chat')
    .send({ chatId: 'default', message: 'como melhorar observabilidade' })
    .expect(200);

  const response = await request(app)
    .get('/api/chats/default/search?q=observabilidade')
    .expect(200);

  assert.equal(Array.isArray(response.body.matches), true);
  assert.equal(response.body.matches.length > 0, true);
  assert.equal(
    response.body.matches.some((item) => item.content.includes('observabilidade')),
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
    .post('/api/chat')
    .send({ chatId: 'default', message: 'filtro role um' })
    .expect(200);

  await request(app)
    .post('/api/chat')
    .send({ chatId: 'default', message: 'filtro role dois' })
    .expect(200);

  const response = await request(app)
    .get('/api/chats/default/search?q=filtro&role=user&limit=1&page=2')
    .expect(200);

  assert.equal(Array.isArray(response.body.matches), true);
  assert.equal(response.body.matches.length, 1);
  assert.equal(response.body.matches.every((item) => item.role === 'user'), true);
  assert.equal(response.body.pagination.page, 2);
  assert.equal(response.body.pagination.limit, 1);
  assert.equal(response.body.pagination.total >= 2, true);
  assert.equal(response.body.pagination.totalPages >= 2, true);
});

test("POST /api/chat usa fallback quando modelo primario falha", async () => {
  const app = createApp({
    ...createMockStore(),
    ollamaFallbackModel: 'mistral',
    ollamaMaxAttempts: 2,
    chatClient: {
      chat: async ({ model }) => {
        if (model === 'meu-llama3') {
          throw new Error('modelo principal indisponivel');
        }
        return { message: { content: `ok via ${model}` } };
      }
    }
  });

  const response = await request(app)
    .post('/api/chat')
    .send({ chatId: 'default', message: 'teste fallback', model: 'meu-llama3' })
    .expect(200);

  assert.equal(response.body.reply, 'ok via mistral');
});

test("POST /api/chat-stream usa fallback quando modelo primario falha", async () => {
  const app = createApp({
    ...createMockStore(),
    ollamaFallbackModel: 'mistral',
    ollamaMaxAttempts: 2,
    chatClient: {
      chat: async ({ model, stream }) => {
        if (model === 'meu-llama3') {
          throw new Error('modelo principal indisponivel');
        }

        if (!stream) {
          return { message: { content: `ok via ${model}` } };
        }

        async function* generator() {
          yield { message: { content: 'stream fallback' } };
        }

        return generator();
      }
    }
  });

  const response = await request(app)
    .post('/api/chat-stream')
    .send({ chatId: 'default', message: 'teste fallback stream', model: 'meu-llama3' })
    .expect(200);

  assert.equal(response.text.includes('stream fallback'), true);
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
    .post('/api/chat')
    .send({ chatId: 'default', message: 'timeout test', model: 'meu-llama3' })
    .expect(504);

  assert.equal(
    String(response.body?.error || response.text || '').includes('Tempo limite excedido'),
    true,
  );
});

test("GET /api/chats/:chatId/search valida query curta", async () => {
  const app = createApp({
    chatClient: createMockChatClient(),
    ...createMockStore(),
  });

  const response = await request(app)
    .get('/api/chats/default/search?q=a')
    .expect(400);

  assert.equal(
    String(response.body?.error || response.text || '').includes(
      'Parametro q deve ter pelo menos 2 caracteres',
    ),
    true,
  );
});

test("POST /api/chat-stream retorna erro padrao quando servico externo falha", async () => {
  const app = createApp({
    ...createMockStore(),
    ollamaMaxAttempts: 1,
    chatClient: {
      chat: async () => {
        throw new Error('ollama indisponivel');
      },
    },
  });

  const response = await request(app)
    .post('/api/chat-stream')
    .send({ chatId: 'default', message: 'falha externa', model: 'meu-llama3' })
    .expect(500);

  assert.equal(
    String(response.body?.error || response.text || '').includes('Erro no streaming'),
    true,
  );
});
