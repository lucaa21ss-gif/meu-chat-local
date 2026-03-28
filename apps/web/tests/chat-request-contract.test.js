import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CHAT_REQUEST_SHAPE,
  CHAT_REQUEST_KEYS,
  buildChatRequest,
} from "../src/ui/state/chat-request-contract.js";

describe("CHAT_REQUEST_SHAPE", () => {
  it("deve ser um objeto congelado", () => {
    assert.ok(Object.isFrozen(CHAT_REQUEST_SHAPE));
  });

  it("deve conter exatamente as chaves: message, model, temperature, userId", () => {
    assert.deepStrictEqual(Object.keys(CHAT_REQUEST_SHAPE).sort(), [
      "message",
      "model",
      "temperature",
      "userId",
    ]);
  });

  it("deve ter message vazia por padrão", () => {
    assert.strictEqual(CHAT_REQUEST_SHAPE.message, "");
  });

  it("deve ter model 'meu-llama3' por padrão", () => {
    assert.strictEqual(CHAT_REQUEST_SHAPE.model, "meu-llama3");
  });

  it("deve ter temperature 0.7 por padrão", () => {
    assert.strictEqual(CHAT_REQUEST_SHAPE.temperature, 0.7);
  });

  it("deve ter userId 'user-default' por padrão", () => {
    assert.strictEqual(CHAT_REQUEST_SHAPE.userId, "user-default");
  });
});

describe("CHAT_REQUEST_KEYS", () => {
  it("deve ser um array congelado", () => {
    assert.ok(Object.isFrozen(CHAT_REQUEST_KEYS));
  });

  it("deve conter as mesmas chaves do shape em ordem alfabética", () => {
    const expected = Object.keys(CHAT_REQUEST_SHAPE).sort();
    assert.deepStrictEqual([...CHAT_REQUEST_KEYS], expected);
  });
});

describe("buildChatRequest()", () => {
  it("sem overrides usa os defaults do contrato", () => {
    const req = buildChatRequest("Olá");
    assert.strictEqual(req.message, "Olá");
    assert.strictEqual(req.model, CHAT_REQUEST_SHAPE.model);
    assert.strictEqual(req.temperature, CHAT_REQUEST_SHAPE.temperature);
    assert.strictEqual(req.userId, CHAT_REQUEST_SHAPE.userId);
  });

  it("converte message para string", () => {
    const req = buildChatRequest(42);
    assert.strictEqual(req.message, "42");
  });

  it("trata message null como string vazia", () => {
    const req = buildChatRequest(null);
    assert.strictEqual(req.message, "");
  });

  it("permite override de model", () => {
    const req = buildChatRequest("oi", { model: "outro-modelo" });
    assert.strictEqual(req.model, "outro-modelo");
    assert.strictEqual(req.temperature, CHAT_REQUEST_SHAPE.temperature);
  });

  it("permite override de temperature", () => {
    const req = buildChatRequest("oi", { temperature: 0.2 });
    assert.strictEqual(req.temperature, 0.2);
    assert.strictEqual(req.model, CHAT_REQUEST_SHAPE.model);
  });

  it("permite override de userId", () => {
    const req = buildChatRequest("oi", { userId: "user-123" });
    assert.strictEqual(req.userId, "user-123");
  });

  it("retorna novo objeto a cada chamada", () => {
    const a = buildChatRequest("teste");
    const b = buildChatRequest("teste");
    assert.notStrictEqual(a, b);
  });

  it("não retorna o shape original", () => {
    const req = buildChatRequest("");
    assert.notStrictEqual(req, CHAT_REQUEST_SHAPE);
  });

  it("resultado contém exatamente as chaves do contrato", () => {
    const req = buildChatRequest("msg");
    assert.deepStrictEqual(Object.keys(req).sort(), [...CHAT_REQUEST_KEYS]);
  });
});
