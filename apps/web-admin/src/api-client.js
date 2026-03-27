/**
 * Cliente Wrapper HTTP
 * Usamos caminhos relativos para garantir portabilidade. 
 * O Vite proxy fará a tradução /api -> http://localhost:3001/api no desenvolvimento.
 * Em produção, ele já estará rodando do mesmo host do painel se servido via express estático.
 */

export class ApiClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  async rawFetch(endpoint, options = {}) {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    
    // Fallback: se estiver rodando via arquivo file:// (ex: VSCode isolado), tente conectar ao 3001.
    let url = `${this.baseUrl}${endpoint}`;
    if (window.location.protocol === 'file:') {
       url = `http://localhost:3001/api${endpoint}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
    });

    if (!response.ok) {
      let message = response.statusText;
      try {
        const errJson = await response.json();
        if (errJson.error) message = errJson.error;
      } catch (e) {}
      throw new Error(`API Error [${response.status}]: ${message}`);
    }

    return response.json();
  }

  // --- Módulos da API (Mapeados na Análise) ---

  async checkHealth() {
    return this.rawFetch('/healthz');
  }

  async getHealthMetrics() {
    // Aponta para a rota principal rica em dados do backend
    return this.rawFetch('/health');
  }

  async triggerGC() {
    return this.rawFetch('/observability/gc', { method: 'POST' });
  }

  async getIncidentLogs() {
    // Exemplo de como consumiria incidentes bloqueados 
    // Em base na infra real analisada (`/api/incident/records` -> hipotético, validaremos no uso)
    return this.rawFetch('/incident/logs').catch(() => []);
  }

  async getConfig() {
    return this.rawFetch('/config').catch(() => ({}));
  }
}

export const api = new ApiClient();
