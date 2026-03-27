/**
 * @module platform/orchestration/desktop-env
 * @description Módulo de ambiente desktop que gerencia o Ollama como dependência
 * do processo Node, e abre automaticamente o navegador na primeira inicialização.
 *
 * Só é ativado quando DESKTOP_MODE=true está definido no ambiente (.env).
 * Em ambiente Docker/CI, o módulo é totalmente inerte (não faz nada).
 *
 * @example
 * import { DesktopEnv } from 'platform/orchestration/desktop-env.js';
 * const desktop = new DesktopEnv({ logger });
 * const ollamaShutdown = await desktop.startOllama(); // Inicia ollama serve
 * lifecycle.registerShutdownHook('ollama', ollamaShutdown); // Registra encerramento
 * await desktop.openBrowser('http://localhost:3001'); // Abre o navegador
 */

import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class DesktopEnv {
  #logger;
  #ollamaProcess = null;
  #readyTimeoutMs;

  constructor({ logger, readyTimeoutMs = 15000 } = {}) {
    this.#logger = logger;
    this.#readyTimeoutMs = readyTimeoutMs;
  }

  /**
   * Verifica se o Ollama já está rodando (para evitar iniciar duas instâncias).
   */
  async #isOllamaAlreadyRunning() {
    try {
      const res = await fetch('http://localhost:11434/');
      return res.ok || res.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Inicia "ollama serve" como processo filho e aguarda a api estar disponível.
   * Retorna uma função de encerramento para ser registrada no AppLifecycle.
   * @returns {Promise<() => void>} Hook de shutdown para o Ollama
   */
  async startOllama() {
    // Não iniciar se já houver uma instância do Ollama rodando
    if (await this.#isOllamaAlreadyRunning()) {
      this.#logger?.info('[Desktop] Ollama já está rodando externamente. Gerenciamento nativo ignorado.');
      return () => {}; // Hook vazio (não matar o que não foi iniciado por nós)
    }

    this.#logger?.info('[Desktop] Iniciando Ollama como dependência gerenciada...');

    this.#ollamaProcess = spawn('ollama', ['serve'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    this.#ollamaProcess.stdout.on('data', (data) => {
      this.#logger?.debug({ source: 'ollama' }, data.toString().trim());
    });
    this.#ollamaProcess.stderr.on('data', (data) => {
      // Ollama escreve seus logs no stderr por padrão
      this.#logger?.debug({ source: 'ollama' }, data.toString().trim());
    });
    this.#ollamaProcess.on('exit', (code, signal) => {
      this.#logger?.info({ code, signal }, '[Desktop] Processo Ollama encerrado.');
    });

    // Aguardar o Ollama ficar disponível (polling)
    await this.#waitForOllama();
    this.#logger?.info('[Desktop] Ollama disponível e pronto para receber inferências.');

    // Retorna o hook de shutdown para ser registrado no AppLifecycle
    return () => this.#killOllama();
  }

  async #waitForOllama() {
    const deadline = Date.now() + this.#readyTimeoutMs;
    while (Date.now() < deadline) {
      if (await this.#isOllamaAlreadyRunning()) return;
      await new Promise((r) => setTimeout(r, 500));
    }
    this.#logger?.warn('[Desktop] Timeout aguardando Ollama. Continuando a inicialização do servidor...');
  }

  #killOllama() {
    if (!this.#ollamaProcess || this.#ollamaProcess.killed) return;
    this.#logger?.info('[Desktop] Encerrando processo do Ollama...');
    
    // Envia SIGTERM para encerramento limpo
    this.#ollamaProcess.kill('SIGTERM');
    
    // Fallback: se não morreu em 3s, mata na força (SIGKILL)
    const forceKillTimeout = setTimeout(() => {
      if (this.#ollamaProcess && !this.#ollamaProcess.killed) {
        this.#logger?.warn('[Desktop] Ollama não respondeu ao SIGTERM. Forçando SIGKILL.');
        this.#ollamaProcess.kill('SIGKILL');
      }
    }, 3000);
    
    this.#ollamaProcess.once('exit', () => clearTimeout(forceKillTimeout));
  }

  /**
   * Abre o navegador padrão do sistema operacional em uma URL específica.
   * Compatível com Linux (WSL), macOS e Windows.
   * @param {string} url
   */
  async openBrowser(url) {
    const platform = process.platform;
    let command;

    if (platform === 'win32') {
      command = `start "" "${url}"`;
    } else if (platform === 'darwin') {
      command = `open "${url}"`;
    } else {
      // Linux (inclui WSL); tenta xdg-open ou wslview
      command = `which wslview > /dev/null 2>&1 && wslview "${url}" || xdg-open "${url}"`;
    }

    try {
      await execAsync(command);
      this.#logger?.info({ url }, '[Desktop] Navegador aberto automaticamente.');
    } catch (err) {
      this.#logger?.warn({ url, err: err.message }, '[Desktop] Não foi possível abrir o navegador automaticamente. Acesse manualmente.');
    }
  }
}
