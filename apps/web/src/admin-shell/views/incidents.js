import { apiClient } from '../lib/api.js';

export class createIncidentsView {
  render() {
    return `
      <div class="p-6 space-y-6">
        <!-- Status Geral -->
        <div id="incident-status" class="bg-[#0f1216] border border-slate-800 rounded-lg p-4">
          <p class="text-slate-500">Carregando status de incidentes...</p>
        </div>

        <!-- Ações -->
        <div class="flex gap-3">
          <button id="check-incidents-btn" class="px-4 py-2 rounded-lg bg-[#0f1216] border border-slate-700 text-slate-200 text-sm hover:border-cyan-400 transition">
            Verificar Incidentes
          </button>
          <button id="run-healing-btn" class="px-4 py-2 rounded-lg bg-[#0f1216] border border-slate-700 text-slate-200 text-sm hover:border-cyan-400 transition">
            Auto-Healing
          </button>
        </div>

        <!-- Histórico -->
        <div class="bg-[#0f1216] border border-slate-800 rounded-lg p-4">
          <h3 class="font-medium text-slate-200 mb-4">Histórico Recente</h3>
          <div id="incidents-history" class="space-y-3 text-sm">
            <p class="text-slate-500">Nenhum incidente registrado</p>
          </div>
        </div>
      </div>
    `;
  }

  mount(container) {
    this.loadIncidents(container);

    container.querySelector('#check-incidents-btn')?.addEventListener('click', () => {
      this.checkIncidents(container);
    });

    container.querySelector('#run-healing-btn')?.addEventListener('click', () => {
      this.runAutoHealing(container);
    });
  }

  async loadIncidents(container) {
    try {
      const response = await apiClient.get('/api/incident/status', { 'x-user-id': 'user-default' });
      const statusEl = container.querySelector('#incident-status');

      const severityColors = {
        critical: 'bg-red-500/10 text-red-400 border-red-400/30',
        high: 'bg-orange-500/10 text-orange-400 border-orange-400/30',
        medium: 'bg-amber-500/10 text-amber-400 border-amber-400/30',
        low: 'bg-blue-500/10 text-blue-400 border-blue-400/30',
        info: 'bg-cyan-500/10 text-cyan-400 border-cyan-400/30'
      };

      const currentColor = severityColors[response.severity] || severityColors.info;

      statusEl.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-slate-200">Status Atual: ${response.status}</h3>
            <p class="text-xs text-slate-500 mt-1">${response.summary || 'Sem incidente ativo'}</p>
          </div>
          <div class="border ${currentColor} rounded-lg px-4 py-2">
            <p class="font-medium text-sm capitalize">${response.severity}</p>
          </div>
        </div>
      `;
    } catch (error) {
      const statusEl = container.querySelector('#incident-status');
      statusEl.innerHTML = `<p class="text-slate-500">Erro: ${error.message}</p>`;
    }
  }

  async checkIncidents(container) {
    // Implementar chamada de verificação
    alert('Verificação de incidentes iniciada');
  }

  async runAutoHealing(container) {
    try {
      await apiClient.post('/api/auto-healing/execute', 
        { policy: 'model-offline' },
        { 'x-user-id': 'user-default' }
      );
      alert('Auto-healing executado');
      this.loadIncidents(container);
    } catch (error) {
      alert(`Erro: ${error.message}`);
    }
  }

  refresh() {
    const container = document.querySelector('main');
    if (container) {
      this.loadIncidents(container);
    }
  }
}
