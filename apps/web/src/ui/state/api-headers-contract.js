/**
 * Contrato de headers HTTP utilizados nas chamadas de API do frontend.
 * Centraliza nomes de headers e valores padrão para evitar literais dispersos.
 *
 * @module api-headers-contract
 */

/**
 * Nomes dos headers customizados enviados pelo frontend.
 */
export const API_HEADER_NAMES = Object.freeze({
  /** Identificador do usuário ativo, exigido por endpoints autenticados. */
  USER_ID: "x-user-id",
  /** Tipo de conteúdo para requisições com body JSON. */
  CONTENT_TYPE: "Content-Type",
});

/**
 * Valores padrão dos headers customizados.
 */
export const API_HEADER_DEFAULTS = Object.freeze({
  /** Valor padrão do header x-user-id quando não há sessão ativa. */
  USER_ID: "user-default",
  /** Valor padrão do Content-Type para JSON. */
  CONTENT_TYPE: "application/json",
});

/**
 * Constrói o objeto de headers com x-user-id preenchido pelo userId fornecido.
 *
 * @param {string} userId - ID do usuário ativo
 * @returns {{ "x-user-id": string }}
 */
export function buildUserIdHeader(userId) {
  return { [API_HEADER_NAMES.USER_ID]: userId || API_HEADER_DEFAULTS.USER_ID };
}

/**
 * Constrói headers completos para requisições JSON autenticadas.
 *
 * @param {string} userId - ID do usuário ativo
 * @returns {{ "Content-Type": string, "x-user-id": string }}
 */
export function buildJsonUserHeaders(userId) {
  return {
    [API_HEADER_NAMES.CONTENT_TYPE]: API_HEADER_DEFAULTS.CONTENT_TYPE,
    [API_HEADER_NAMES.USER_ID]: userId || API_HEADER_DEFAULTS.USER_ID,
  };
}
