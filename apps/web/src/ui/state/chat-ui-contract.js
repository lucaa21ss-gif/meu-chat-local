/**
 * Contrato de copy/mensagens e helpers da tela de chat.
 *
 * @module chat-ui-contract
 */

export const CHAT_STATUS_MESSAGES = Object.freeze({
  SENDING: "Enviando mensagem...",
  SUCCESS: "Mensagem enviada com sucesso.",
  ABORTED: "Geração de IA interrompida.",
});

export const CHAT_STATUS_MESSAGE_KEYS = Object.freeze(
  Object.keys(CHAT_STATUS_MESSAGES).sort(),
);

export const CHAT_UI_COPY = Object.freeze({
  TITLE: "Chat",
  RESPONSE_TITLE: "Resposta",
  TEXTAREA_PLACEHOLDER: "Digite sua mensagem...",
  BUTTON_SEND: "Enviar",
  BUTTON_SENDING: "Enviando...",
  REPLY_FALLBACK: "Sem resposta no payload.",
});

export const CHAT_UI_COPY_KEYS = Object.freeze(
  Object.keys(CHAT_UI_COPY).sort(),
);

export function resolveChatReply(payload) {
  return payload?.response || payload?.message || CHAT_UI_COPY.REPLY_FALLBACK;
}

export function buildChatSendErrorMessage(endpoint) {
  return `Falha ao enviar mensagem para ${endpoint}.`;
}
