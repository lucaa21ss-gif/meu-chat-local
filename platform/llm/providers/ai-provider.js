/**
 * @module platform/llm/providers/ai-provider
 * @description Classe Base / Interface abstrata para o Padrão Strategy de Modelos IA.
 * Garante que qualquer provedor (Ollama, OpenAI, Claude) obedeça às mesmas
 * assinaturas para Streaming, Chat Estático e Cancelamento (Graceful Shutdown).
 */
export class AIProvider {
  /**
   * Identificador do provedor ativo.
   * @type {string}
   */
  get name() {
    throw new Error('Método "name" não implementado pelo Strategy atual.');
  }

  /**
   * Envia a requisição de chat para a LLM, respeitando o formato agnóstico.
   * @param {Object} payload 
   * @param {string} payload.model
   * @param {Array} payload.messages
   * @param {boolean} payload.stream
   * @param {Object} payload.options
   * @returns {Promise<Object|AsyncGenerator>}
   */
  async chat(payload) {
    throw new Error('Método "chat()" não implementado pelo Strategy atual.');
  }

  /**
   * Envia um sinal para matar cirurgicamente quaisquer requests ativos na rede
   * referentes às predições da IA. Fundamental para não segurar VRAM nem travar Containers.
   */
  cancelInFlightRequests() {
    throw new Error('Método "cancelInFlightRequests()" não implementado pelo Strategy atual.');
  }
}
