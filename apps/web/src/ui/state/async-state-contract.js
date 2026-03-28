/**
 * Contrato de estado assíncrono — shape padronizado { data, loading, error }
 * usado em painéis e seções que carregam dados remotos.
 *
 * @module async-state-contract
 */

/**
 * Shape base imutável de uma unidade de estado assíncrono.
 * - data:    resultado de sucesso (null quando não carregado)
 * - loading: indica operação em andamento
 * - error:   mensagem de erro, vazia quando sem falha
 */
export const ASYNC_STATE_SHAPE = Object.freeze({
  data: null,
  error: "",
  loading: false,
});

/**
 * Chaves do shape assíncrono em ordem alfabética.
 */
export const ASYNC_STATE_KEYS = Object.freeze(Object.keys(ASYNC_STATE_SHAPE).sort());

/**
 * Cria um objeto de estado assíncrono com valores padrão do shape,
 * permitindo override parcial tipado.
 *
 * @param {object|null|undefined} [overrides] - Campos a sobrescrever
 * @returns {{ data: unknown, error: string, loading: boolean }}
 */
export function createAsyncState(overrides) {
  if (overrides == null) {
    return { ...ASYNC_STATE_SHAPE };
  }
  return {
    data: "data" in overrides ? overrides.data : ASYNC_STATE_SHAPE.data,
    error: "error" in overrides ? String(overrides.error ?? "") : ASYNC_STATE_SHAPE.error,
    loading: "loading" in overrides ? Boolean(overrides.loading) : ASYNC_STATE_SHAPE.loading,
  };
}
