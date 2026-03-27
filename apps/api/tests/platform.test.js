/**
 * Testes focados na camada Platform:
 *  – AppLifecycle (ordem LIFO, tolerância a ERR_SERVER_NOT_RUNNING, idempotência)
 *  – Logger estruturado (exports mínimos)
 *  – Endpoints de saúde: /healthz (liveness) e /readyz (readiness)
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { AppLifecycle } from "../../../platform/orchestration/lifecycle.js";
import logger, {
  createHttpLogger,
} from "../../../platform/observability/logging/logger.js";
import { createApp } from "../src/entrypoints/index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nullLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  debug: () => {},
};

/**
 * Store mínimo: todos os métodos esperados por createStore().
 * Retorna valores vazio-seguros para não forçar acesso ao SQLite.
 */
function createMinimalMockStore() {
  const noop = async () => {};
  const emptyList = async () => [];
  const emptyPage = async () => ({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });

  return {
    initDb: noop,
    listChats: emptyList,
    createChat: noop,
    duplicateChat: noop,
    renameChat: noop,
    deleteChat: noop,
    setChatFavorite: noop,
    setChatArchived: noop,
    setChatTags: noop,
    setChatSystemPrompt: noop,
    getChatSystemPrompts: async () => null,
    ensureChat: noop,
    getMessages: emptyList,
    searchMessages: emptyPage,
    appendAuditLog: noop,
    appendConfigVersion: noop,
    listAuditLogs: emptyPage,
    listConfigVersions: emptyPage,
    getConfigVersionById: async () => null,
    exportAuditLogs: async () => ({
      version: 1,
      exportedAt: new Date().toISOString(),
      filters: {},
      logs: [],
    }),
    upsertRagDocument: noop,
    listRagDocuments: emptyList,
    searchDocumentChunks: emptyList,
    listUsers: async () => [
      {
        id: "user-default",
        name: "padrao",
        role: "admin",
        theme: "system",
        defaultSystemPrompt: "",
        storageLimitMb: 512,
      },
    ],
    createUser: noop,
    renameUser: async () => null,
    setUserTheme: async () => null,
    setUserStorageLimit: async () => null,
    setUserRole: async () => null,
    setUserDefaultSystemPrompt: async () => null,
    deleteUser: noop,
    getUserById: async () => null,
    ensureUser: noop,
    getUiPreferences: async () => null,
    setUiPreferences: async () => null,
    appendMessage: noop,
    resetChat: noop,
    exportChatMarkdown: async () => null,
    exportChatJson: async () => null,
    importChatJson: noop,
    renameChatFromFirstMessage: noop,
  };
}

const minimalChatClient = { chat: async () => ({ message: { content: "ok" } }) };

// ─── AppLifecycle ─────────────────────────────────────────────────────────────

test("AppLifecycle: registerShutdownHook com non-function lança TypeError", () => {
  const lifecycle = new AppLifecycle({ logger: nullLogger });
  assert.throws(
    () => lifecycle.registerShutdownHook("meu-hook", 42),
    (err) => err instanceof TypeError && err.message.includes("meu-hook"),
  );
});

test("AppLifecycle: registerHttpServer e registerShutdownHook são encadeáveis (retornam this)", () => {
  const lifecycle = new AppLifecycle({ logger: nullLogger });
  const fakeServer = { close: () => {} };
  assert.equal(lifecycle.registerHttpServer(fakeServer), lifecycle);
  assert.equal(lifecycle.registerShutdownHook("test", () => {}), lifecycle);
});

test("AppLifecycle: hooks executados em ordem LIFO no shutdown programático", async () => {
  const lifecycle = new AppLifecycle({ logger: nullLogger });
  const order = [];

  lifecycle.registerShutdownHook("primeiro", () => order.push("primeiro"));
  lifecycle.registerShutdownHook("segundo", () => order.push("segundo"));
  lifecycle.registerShutdownHook("terceiro", () => order.push("terceiro"));

  await lifecycle.shutdown();

  assert.deepEqual(order, ["terceiro", "segundo", "primeiro"]);
});

test("AppLifecycle: tolerância a ERR_SERVER_NOT_RUNNING no encerramento HTTP", async () => {
  const lifecycle = new AppLifecycle({ logger: nullLogger });
  const fakeServer = {
    close(cb) {
      const err = new Error("not running");
      err.code = "ERR_SERVER_NOT_RUNNING";
      cb(err);
    },
  };
  lifecycle.registerHttpServer(fakeServer);
  await assert.doesNotReject(() => lifecycle.shutdown());
});

test("AppLifecycle: falha em hook não interrompe execução dos demais", async () => {
  const lifecycle = new AppLifecycle({ logger: nullLogger });
  const reached = [];

  lifecycle.registerShutdownHook("a", () => reached.push("a"));
  lifecycle.registerShutdownHook("falha", () => {
    throw new Error("erro proposital");
  });
  lifecycle.registerShutdownHook("b", () => reached.push("b"));

  await lifecycle.shutdown();

  // LIFO: b executa antes de falha, falha antes de a
  assert.ok(reached.includes("a"), "hook 'a' deve ser executado mesmo com falha em outro");
  assert.ok(reached.includes("b"), "hook 'b' deve ser executado mesmo com falha em outro");
});

test("AppLifecycle: shutdown() é idempotente — segunda chamada ignorada", async () => {
  const lifecycle = new AppLifecycle({ logger: nullLogger });
  let callCount = 0;
  lifecycle.registerShutdownHook("contador", () => { callCount += 1; });

  await lifecycle.shutdown();
  await lifecycle.shutdown(); // segunda chamada — não deve executar hooks novamente

  assert.equal(callCount, 1, "hooks devem ser executados somente uma vez");
});

// ─── Logger estruturado ───────────────────────────────────────────────────────

test("logger: export default possui métodos de log estruturado padrão", () => {
  for (const method of ["info", "warn", "error", "fatal", "debug"]) {
    assert.equal(
      typeof logger[method],
      "function",
      `logger.${method} deve ser function`,
    );
  }
});

test("createHttpLogger: retorna middleware Express (function)", () => {
  const middleware = createHttpLogger();
  assert.equal(
    typeof middleware,
    "function",
    "createHttpLogger() deve retornar uma função middleware",
  );
});

// ─── Health endpoints ─────────────────────────────────────────────────────────

test("GET /healthz retorna 200 com status ok (liveness check)", async () => {
  const app = createApp({
    chatClient: minimalChatClient,
    ...createMinimalMockStore(),
  });

  const res = await request(app).get("/healthz").expect(200);

  assert.equal(res.body.status, "ok");
  assert.equal(res.body.service, "chat-server");
  assert.equal(typeof res.body.uptime, "number");
});

test("GET /readyz retorna 200 com status ready quando store responde (readiness check)", async () => {
  const app = createApp({
    chatClient: minimalChatClient,
    ...createMinimalMockStore(),
  });

  const res = await request(app).get("/readyz").expect(200);

  assert.equal(res.body.status, "ready");
  assert.equal(typeof res.body.uptime, "number");
  assert.equal(typeof res.body.responseTime, "number");
});

test("GET /readyz retorna 500 quando store.listChats lança erro (degradação detectada)", async () => {
  const store = createMinimalMockStore();
  store.listChats = async () => {
    throw new Error("simulação de falha no db");
  };

  const app = createApp({
    chatClient: minimalChatClient,
    ...store,
  });

  await request(app).get("/readyz").expect(500);
});

test("GET /api/health/public retorna payload sanitizado com status/checks", async () => {
  const app = createApp({
    chatClient: minimalChatClient,
    ...createMinimalMockStore(),
  });

  const res = await request(app).get("/api/health/public").expect(200);

  assert.equal(typeof res.body.status, "string");
  assert.equal(typeof res.body.generatedAt, "string");
  assert.equal(typeof res.body.uptime, "number");
  assert.equal(typeof res.body.checks?.db?.status, "string");
  assert.equal(typeof res.body.checks?.model?.status, "string");
  assert.equal(typeof res.body.checks?.disk?.status, "string");
});

test("GET /api/health/public nao expoe campos operacionais ricos", async () => {
  const app = createApp({
    chatClient: minimalChatClient,
    ...createMinimalMockStore(),
  });

  const res = await request(app).get("/api/health/public").expect(200);

  assert.equal("memory" in res.body, false);
  assert.equal("alerts" in res.body, false);
  assert.equal("queue" in res.body, false);
  assert.equal("telemetry" in res.body, false);
  assert.equal("rateLimiter" in res.body, false);
  assert.equal("baseline" in res.body, false);
  assert.equal("capacity" in res.body, false);
});
