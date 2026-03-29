import { OllamaProvider } from "./providers/ollama-provider.js";
import { OpenAIProvider } from "./providers/openai-provider.js";

/**
 * Central que decide em Run-time qual motor de Inteligência o 
 * servidor alimentará em seus módulos, baseando-se no Manifesto Strategy.
 */
export class AIFactory {
  /**
   * Lê as credenciais rodando e entrega a classe instanciada ideal.
   * Por padrão, a proposta nativa `@meu-chat-local` injetada é o Ollama Privado
   * visando privacidade absoluta.
   *
   * @returns {import('./providers/ai-provider.js').AIProvider}
   */
  static createProvider() {
    if (process.env.USE_OPENAI === "true" && process.env.OPENAI_API_KEY) {
      console.log("[AIFactory] Inicializando Motor: OpenAI (Cloud Mode)");
      return new OpenAIProvider();
    }
    
    console.log("[AIFactory] Inicializando Motor: Ollama (Privacy Mode)");
    return new OllamaProvider();
  }
}
