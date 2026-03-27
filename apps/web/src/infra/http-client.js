/**
 * HttpClient — adapter de infraestrutura para chamadas HTTP.
 *
 * Centraliza fetch, tratamento de erros, trace-ids, retry e JSON body.
 * Substitui os métodos espalhados em `api.js` e `fetch-helpers.js`.
 *
 * @module infra/http-client
 */

/**
 * @typedef {Object} HttpClientOptions
 * @property {string}  [baseUrl=""]       URL base para todas as requisições
 * @property {number}  [timeoutMs=30000]  Timeout máximo por requisição
 * @property {number}  [retries=0]        Número de retentativas em caso de falha de rede
 * @property {number}  [retryDelayMs=500] Delay entre retentativas
 */

/**
 * Cria um cliente HTTP com tratamento de erros padronizado.
 *
 * @param {HttpClientOptions} options
 * @returns {{ fetchJson, fetchJsonBody, withRetry }}
 */
export function createHttpClient(options = {}) {
  const {
    baseUrl     = "",
    timeoutMs   = 30000,
    retries     = 0,
    retryDelayMs = 500,
  } = options;

  /**
   * Faz um GET/POST/PATCH/DELETE e retorna o JSON parseado.
   * Lança Error com `.status` e `.traceId` em caso de erro HTTP.
   *
   * @param {string} path           Caminho relativo à baseUrl
   * @param {RequestInit} [init={}] Opções do fetch nativo
   * @returns {Promise<any>}
   */
  async function fetchJson(path, init = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: init.signal ?? controller.signal,
      });

      const traceId = response.headers.get("x-trace-id") || null;

      if (!response.ok) {
        let detail = "";
        let serverTraceId = traceId;

        try {
          const data = await response.json();
          detail = data?.error || "";
          if (data?.traceId) serverTraceId = data.traceId;
        } catch {
          try { detail = await response.text(); } catch { detail = ""; }
        }

        const msg = (detail || `Falha na requisição (${response.status})`).trim();
        const err = new Error(msg);
        err.traceId = serverTraceId;
        err.status  = response.status;
        throw err;
      }

      return response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Convenience: faz POST/PATCH/PUT/DELETE com body JSON.
   *
   * @param {string} path
   * @param {string} method  "POST" | "PATCH" | "PUT" | "DELETE"
   * @param {object} body    Objeto a serializar como JSON
   * @returns {Promise<any>}
   */
  function fetchJsonBody(path, method, body) {
    return fetchJson(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  /**
   * Executa uma action async com retry + callback de erro.
   *
   * @param {() => Promise<any>} action
   * @param {{ onSuccess?: string, onError?: string, maxRetries?: number }} opts
   * @returns {Promise<any>}
   */
  async function withRetry(action, opts = {}) {
    const max = opts.maxRetries ?? retries;
    let lastError;

    for (let attempt = 0; attempt <= max; attempt++) {
      try {
        return await action();
      } catch (err) {
        lastError = err;
        if (attempt < max) {
          await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  return { fetchJson, fetchJsonBody, withRetry };
}
