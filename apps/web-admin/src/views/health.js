import { apiClient } from '../lib/api.js';

export class createHealthView {
  render() {
    return `
      <div class="p-6 space-y-6">
        <div id="health-container" class="space-y-4">
          <p class="text-slate-500">Carregando status de saúde...</p>
        </div>
      </div>
    `;
  }

  mount(container) {
    this.loadHealth(container);
  }

  async loadHealth(container) {
    try {
      const response = await apiClient.get('/api/health/public');
      const healthContainer = container.querySelector('#health-container');

      const checksHtml = Object.entries(response.checks || {})
        .map(([name, check]) => {
          const isHealthy = check.status === 'healthy';
          const bgColor = isHealthy ? 'bg-[#051a16]' : 'bg-[#1a0505]';
          const borderColor = isHealthy ? 'border-emerald-400/30' : 'border-red-400/30';
          const textColor = isHealthy ? 'text-emerald-400' : 'text-red-400';

          return `
            <div class="bg-[#0f1216] border border-slate-800 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-medium text-slate-200 capitalize">${name}</h3>
                  <p class="text-sm text-slate-500 mt-1">${check.message || 'Status verificado'}</p>
                </div>
                <div class="${bgColor} border ${borderColor} rounded-lg px-3 py-2">
                  <p class="${textColor} font-medium text-sm">
                    ${isHealthy ? '✓ Saudável' : '✕ Falha'}
                  </p>
                </div>
              </div>
            </div>
          `;
        }).join('');

      healthContainer.innerHTML = `
        <div class="bg-[#0f1216] border border-slate-800 rounded-lg p-6">
          <h2 class="text-lg font-bold text-slate-200 mb-4">Status de Saúde</h2>
          <p class="text-sm text-slate-400 mb-4">Atualizado em: ${new Date().toLocaleTimeString('pt-BR')}</p>
          <div class="space-y-3">
            ${checksHtml}
          </div>
        </div>
      `;
    } catch (error) {
      const healthContainer = container.querySelector('#health-container');
      healthContainer.innerHTML = `
        <div class="bg-[#1a0505] border border-red-400/30 rounded-lg p-4">
          <p class="text-red-400">Erro ao carregar status: ${error.message}</p>
        </div>
      `;
    }
  }

  refresh() {
    const container = document.querySelector('#health-container').closest('[data-view]')?.parentElement;
    if (container) {
      this.loadHealth(container);
    }
  }
}
