import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CHAT_STATUS_MESSAGES,
  CHAT_STATUS_MESSAGE_KEYS,
  CHAT_UI_COPY,
  CHAT_UI_COPY_KEYS,
  resolveChatReply,
  buildChatSendErrorMessage,
} from "../src/ui/state/chat-ui-contract.js";
import { API_ENDPOINTS } from "../src/ui/state/api-endpoints-contract.js";

describe("CHAT_STATUS_MESSAGES", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(CHAT_STATUS_MESSAGES));
  });

  it("deve conter mensagens de envio e sucesso", () => {
    assert.equal(CHAT_STATUS_MESSAGES.SENDING, "Enviando mensagem...");
    assert.equal(CHAT_STATUS_MESSAGES.SUCCESS, "Mensagem enviada com sucesso.");
  });
});

describe("CHAT_STATUS_MESSAGE_KEYS", () => {
  it("deve refletir as chaves em ordem alfabética", () => {
    assert.deepEqual(CHAT_STATUS_MESSAGE_KEYS, Object.keys(CHAT_STATUS_MESSAGES).sort());
  });
});

describe("CHAT_UI_COPY", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(CHAT_UI_COPY));
  });

  it("deve conter copy de UI esperada", () => {
    assert.equal(CHAT_UI_COPY.TITLE, "Chat");
    assert.equal(CHAT_UI_COPY.RESPONSE_TITLE, "Resposta");
    assert.equal(CHAT_UI_COPY.BUTTON_SEND, "Enviar");
    assert.equal(CHAT_UI_COPY.BUTTON_SENDING, "Enviando...");
    assert.equal(CHAT_UI_COPY.REPLY_FALLBACK, "Sem resposta no payload.");
  });
});

describe("CHAT_UI_COPY_KEYS", () => {
  it("deve refletir as chaves em ordem alfabética", () => {
    assert.deepEqual(CHAT_UI_COPY_KEYS, Object.keys(CHAT_UI_COPY).sort());
  });
});

describe("resolveChatReply()", () => {
  it("prioriza payload.response", () => {
    assert.equal(resolveChatReply({ response: "ok", message: "fallback" }), "ok");
  });

  it("usa payload.message quando response não existe", () => {
    assert.equal(resolveChatReply({ message: "ok" }), "ok");
  });

  it("usa fallback quando payload não tem conteúdo", () => {
    assert.equal(resolveChatReply({}), CHAT_UI_COPY.REPLY_FALLBACK);
  });
});

describe("buildChatSendErrorMessage()", () => {
  it("deve montar mensagem com endpoint", () => {
    assert.equal(
      buildChatSendErrorMessage(API_ENDPOINTS.CHAT),
      `Falha ao enviar mensagem para ${API_ENDPOINTS.CHAT}.`,
    );
  });
});