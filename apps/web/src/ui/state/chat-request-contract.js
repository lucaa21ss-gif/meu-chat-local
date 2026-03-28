/**
 * Contrato de payload da requisição de chat para /api/chat.
 * Centraliza os defaults (model, temperature, userId) e expõe
 * uma factory para construir o body de cada requisição.
 *
 * @module chat-request-contract
 */

/**
 * Shape base imutável do payload enviado ao endpoint /api/chat.
 * - message:     conteúdo da mensagem do usuário
 * - model:       identificador do modelo LLM configurado localmente
 * - temperature: parâmetro de aleatoriedade do modelo (0..1)
 * - userId:      identificador do usuário para rastreio de histórico
 */
export const CHAT_REQUEST_SHAPE = Object.freeze({
  message: "",
  model: "meu-llama3",
  temperature: 0.7,
  userId: "user-default",
});

/**
 * Chaves do shape de requisição em ordem alfabética.
 */
export const CHAT_REQUEST_KEYS = Object.freeze(
  Object.keys(CHAT_REQUEST_SHAPE).sort(),
);

/**
 * Constrói o objeto de payload para /api/chat a partir de uma mensagem
 * e overrides opcionais, usando os defaults do contrato.
 *
 * @param {string} message - Texto da mensagem do usuário
 * @param {object|null|undefined} [overrides] - Campos a sobrescrever (model, temperature, userId)
 * @returns {{ message: string, model: string, temperature: number, userId: string }}
 */
export function buildChatRequest(message, overrides) {
  return {
    message: String(message ?? ""),
    model:
      overrides != null && "model" in overrides
        ? overrides.model
        : CHAT_REQUEST_SHAPE.model,
    temperature:
      overrides != null && "temperature" in overrides
        ? overrides.temperature
        : CHAT_REQUEST_SHAPE.temperature,
    userId:
      overrides != null && "userId" in overrides
        ? overrides.userId
        : CHAT_REQUEST_SHAPE.userId,
  };
}
