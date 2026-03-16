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
