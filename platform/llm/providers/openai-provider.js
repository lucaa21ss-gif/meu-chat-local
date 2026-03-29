import { AIProvider } from "./ai-provider.js";

/**
 * Fallback para Nuvem. É criado apenas no "mode enterprise" se o 
 * usuário providenciar via .env uma chave de terceiros, priorizando
 * manter o padrão Strategy do sistema livre de dependência fixa.
 */
export class OpenAIProvider extends AIProvider {
  /** @type {Set<AbortController>} */
  #activeRequests = new Set();
  
  constructor() {
    super();
    // Exemplo: this.#client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  get name() {
    return "OpenAI (GPT)";
  }

  async chat(payload) {
    const controller = new AbortController();
    this.#activeRequests.add(controller);

    try {
      console.log(`[OpenAIProvider] Interceptou o payload via Adapter: `, payload.messages.length);
      // Aqui integraria this.#client.chat.completions.create({...})
      // Por ora retornamos stub se fosse disparar
      throw new Error(`OpenAI Interface pronta mas ainda sem biblioteca instalada. Fallback necessário!`);
    } finally {
      if (!payload.stream) {
         this.#activeRequests.delete(controller);
      }
    }
  }

  cancelInFlightRequests() {
    const total = this.#activeRequests.size;
    if (total === 0) return;

    for (const controller of this.#activeRequests) {
      try {
        controller.abort("Desconexão HTTP OpenAI cancelada.");
      } catch(e) {}
    }
    this.#activeRequests.clear();
  }
}
