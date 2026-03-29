import { Ollama } from "ollama";
import { AIProvider } from "./ai-provider.js";

/**
 * Provedor Oficial Local de Modelos (Base do Sistema).
 * Herda a Estratégia Genérica (AIProvider) e utiliza o driver
 * nativo do Ollama operando pela rede local de maneira privada.
 */
export class OllamaProvider extends AIProvider {
  /** @type {Ollama} */
  #client;
  /** @type {Set<AbortController>} */
  #activeRequests = new Set();
  
  constructor() {
    super();
    this.#client = new Ollama({
      host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434",
    });
  }

  get name() {
    return "Ollama (LLM Local Privado)";
  }

  /**
   * Encapsula a lógica de Inference em Streaming/Block passando
   * automaticamente um AbortSignal para gerenciar a VRAM.
   */
  async chat(payload) {
    const controller = new AbortController();
    this.#activeRequests.add(controller);

    // Se a interface Web pedir o cancelamento (Parar Geração), ativamos o aborto atrelado:
    if (payload.abortSignal) {
        payload.abortSignal.addEventListener('abort', () => {
            controller.abort("User cancelled generation via UI.");
        });
    }

    try {
      // O SDK de Ollama aceita um { abortSignal } para interromper a rede na API HTTP nativa.
      const response = await this.#client.chat({
        ...payload,
        abortSignal: controller.signal
      });

      // Se for stream AsyncGenerator, englobamos num wrapper para rastrear o FIM:
      if (payload.stream) {
        const self = this;
        return (async function* () {
          try {
            for await (const chunk of response) {
              yield chunk;
            }
          } finally {
            self.#activeRequests.delete(controller);
          }
        })();
      }

      return response;
    } finally {
      // Remover a referência se ela for apenas bloco fechado (NÃO stream).
      if (!payload.stream) {
         this.#activeRequests.delete(controller);
      }
    }
  }

  /**
   * Operação Cirúrgica a ser amarrada no Graceful Shutdown (AppLifecycle).
   * Corta as conexões ativas na mesma hora.
   */
  cancelInFlightRequests() {
    const total = this.#activeRequests.size;
    if (total === 0) return;

    for (const controller of this.#activeRequests) {
      try {
        controller.abort("Graceful Shutdown: Server interruping open generation requests.");
      } catch(e) {}
    }
    
    this.#activeRequests.clear();
    console.log(`[OllamaProvider] Abortados ${total} stream(s) ativos no motor do LLM.`);
  }
}
