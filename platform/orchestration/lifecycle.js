/**
 * @module platform/orchestration/lifecycle
 * @description Gerenciador de Ciclo de Vida do Servidor.
 *
 * Opera em duas fases:
 * 1. REGISTRO: Recebe handles de recursos abertos (http.Server, DB connection, etc.) 
 *    e funções de encerramento de processos filho (ex: Ollama).
 * 2. INTERCEPTAÇÃO: Ao capturar SIGINT ou SIGTERM, orquestra o shutdown gracioso
 *    em cascata garantindo que nenhum dado seja corrompido e nenhum processo
 *    fique órfão consumindo recursos do sistema.
 *
 * @example
 * import { AppLifecycle } from 'platform/orchestration/lifecycle.js';
 * const lifecycle = new AppLifecycle({ logger });
 * lifecycle.registerHttpServer(httpServer);
 * lifecycle.registerShutdownHook('db', () => db.close());
 * lifecycle.registerShutdownHook('ollama', () => ollamaProcess.kill('SIGTERM'));
 * lifecycle.listen(); // Arma os handlers de sinal do SO
 */

export class AppLifecycle {
  #logger;
  #httpServer = null;
  #shutdownHooks = new Map();
  #isShuttingDown = false;
  #shutdownTimeoutMs;

  /**
   * @param {object} opts
   * @param {import('pino').Logger} opts.logger - Logger injectado (pino ou compatível)
   * @param {number} [opts.shutdownTimeoutMs=8000] - Tempo máximo de espera pelo graceful shutdown  
   */
  constructor({ logger, shutdownTimeoutMs = 8000 } = {}) {
    this.#logger = logger;
    this.#shutdownTimeoutMs = shutdownTimeoutMs;
  }

  /**
   * Registra a instância do servidor HTTP (ex: retorno de app.listen()).
   * @param {import('http').Server} server
   */
  registerHttpServer(server) {
    this.#httpServer = server;
    return this;
  }

  /**
   * Registra um hook de encerramento a ser chamado na ordem inversa de registro.
   * @param {string} name - Identificador legível (ex: 'db', 'ollama', 'cache')
   * @param {() => Promise<void>|void} fn - Função a executar no shutdown
   */
  registerShutdownHook(name, fn) {
    if (typeof fn !== 'function') {
      throw new TypeError(`Hook "${name}" deve ser uma função.`);
    }
    this.#shutdownHooks.set(name, fn);
    return this;
  }

  /**
   * Arma os handlers de sinal do Processo. Chame isso após inicializar tudo.
   */
  listen() {
    const handleShutdown = (signal) => {
      if (this.#isShuttingDown) return;
      this.#isShuttingDown = true;
      this.#logger?.info({ signal }, `[Lifecycle] Sinal recebido: ${signal}. Iniciando Graceful Shutdown...`);
      this.#shutdown().then(() => process.exit(0)).catch((err) => {
        this.#logger?.error(err, '[Lifecycle] Erro durante o shutdown. Forçando encerramento.');
        process.exit(1);
      });
    };

    process.once('SIGINT',  () => handleShutdown('SIGINT'));
    process.once('SIGTERM', () => handleShutdown('SIGTERM'));
    process.once('uncaughtException', (err) => {
      this.#logger?.fatal(err, '[Lifecycle] Exceção não capturada. Iniciando Graceful Shutdown.');
      handleShutdown('uncaughtException');
    });

    this.#logger?.info('[Lifecycle] Gerenciador de ciclo de vida armado. Aguardando sinais do SO.');
    return this;
  }

  /**
   * Inicia o graceful shutdown programaticamente, sem depender de sinal do SO.
   * Idempotente: chamadas subsequentes são ignoradas silenciosamente.
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (this.#isShuttingDown) return;
    this.#isShuttingDown = true;
    await this.#shutdown();
  }

  async #shutdown() {
    const timeoutHandle = setTimeout(() => {
      this.#logger?.error(`[Lifecycle] Timeout de ${this.#shutdownTimeoutMs}ms excedido. Forçando encerramento.`);
      process.exit(1);
    }, this.#shutdownTimeoutMs);

    try {
      // 1. Parar de aceitar novas conexões HTTP
      if (this.#httpServer) {
        await new Promise((resolve, reject) => {
          this.#logger?.info('[Lifecycle] Encerrando HTTP Server...');
          this.#httpServer.close((err) => {
            if (!err || err.code === 'ERR_SERVER_NOT_RUNNING') {
              resolve();
            } else {
              reject(err);
            }
          });
        });
        this.#logger?.info('[Lifecycle] HTTP Server encerrado.');
      }

      // 2. Executar hooks na ordem inversa de registro (último registrado = primeiro a fechar)
      const hooks = [...this.#shutdownHooks.entries()].reverse();
      for (const [name, fn] of hooks) {
        this.#logger?.info(`[Lifecycle] Executando hook de shutdown: "${name}"...`);
        try {
          await Promise.resolve(fn());
          this.#logger?.info(`[Lifecycle] Hook "${name}" concluído.`);
        } catch (err) {
          this.#logger?.error(err, `[Lifecycle] Falha no hook "${name}". Continuando...`);
        }
      }
    } finally {
      clearTimeout(timeoutHandle);
      this.#logger?.info('[Lifecycle] Graceful Shutdown concluído. Sistema encerrado com segurança.');
    }
  }
}
