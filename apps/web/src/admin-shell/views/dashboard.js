import { apiClient } from '../lib/api.js';

export class createDashboardView {
  constructor() {
    this.data = {
      health: null,
      uptime: 0,
      memory: 0,
    };
  }

  render() {
    return `
      <div class="p-6 space-y-6">
        <!-- Cards de Status -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-[#0f1216] border border-slate-800 rounded-lg p-4">
            <p class="text-slate-500 text-sm">API Status</p>
            <p class="text-2xl font-bold text-cyan-400 mt-2">● Ativo</p>
          </div>
          <div class="bg-[#0f1216] border border-slate-800 rounded-lg p-4">
            <p class="text-slate-500 text-sm">Uptime</p>
            <p class="text-2xl font-bold text-emerald-400 mt-2" id="uptime-value">--</p>
          </div>
          <div class="bg-[#0f1216] border border-slate-800 rounded-lg p-4">
            <p class="text-slate-500 text-sm">Memória</p>
            <p class="text-2xl font-bold text-indigo-400 mt-2" id="memory-value">--</p>
          </div>
          <div class="bg-[#0f1216] border border-slate-800 rounded-lg p-4">
            <p class="text-slate-500 text-sm">Porta</p>
            <p class="text-2xl font-bold text-violet-400 mt-2">4000</p>
          </div>
        </div>

        <!-- Grid de Funcionalidades -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-[#0f1216] border border-slate-800 rounded-lg p-4 hover:border-cyan-400/50 transition cursor-pointer" data-action="health">
            <p class="text-cyan-400 text-lg">🏥</p>
            <p class="font-medium text-slate-200 mt-2">Saúde do Sistema</p>
            <p class="text-xs text-slate-500 mt-1">Verificar status dos componentes</p>
          </div>

          <div class="bg-[#0f1216] border border-slate-800 rounded-lg p-4 hover:border-cyan-400/50 transition cursor-pointer" data-action="backups">
            <p class="text-cyan-400 text-lg">💾</p>
            <p class="font-medium text-slate-200 mt-2">Backups</p>
            <p class="text-xs text-slate-500 mt-1">Gerenciar e restaurar backups</p>
          </div>

          <div class="bg-[#0f1216] border border-slate-800 rounded-lg p-4 hover:border-cyan-400/50 transition cursor-pointer" data-action="users">
            <p class="text-cyan-400 text-lg">👥</p>
            <p class="font-medium text-slate-200 mt-2">Usuários</p>
            <p class="text-xs text-slate-500 mt-1">Gerenciar perfis e permissões</p>
          </div>

          <div class="bg-[#0f1216] border border-slate-800 rounded-lg p-4 hover:border-cyan-400/50 transition cursor-pointer" data-action="incidents">
            <p class="text-cyan-400 text-lg">🚨</p>
            <p class="font-medium text-slate-200 mt-2">Incidentes</p>
            <p class="text-xs text-slate-500 mt-1">Monitorar e responder</p>
          </div>
        </div>

        <!-- Logs Recentes -->
        <div class="bg-[#0f1216] border border-slate-800 rounded-lg p-4">
          <h3 class="font-medium text-slate-200 mb-4">Eventos Recentes</h3>
          <div id="events-list" class="space-y-2 text-xs font-mono">
            <p class="text-slate-500">Carregando eventos...</p>
          </div>
        </div>
      </div>
    `;
  }

  mount(container) {
    this.loadData();
    
    // Navegação via cards
    container.querySelectorAll('[data-action]').forEach(card => {
      card.addEventListener('click', () => {
        // Implementar navegação para a router aqui
      });
    });
  }

  async loadData() {
    try {
      const health = await apiClient.get('/api/health/public');
      const diagnostics = await apiClient.get('/api/diagnostics/export');

      // Atualiza cards de uptime e memória
      const uptimeEl = document.querySelector('#uptime-value');
      const memoryEl = document.querySelector('#memory-value');

      if (health && health.uptime) {
        uptimeEl.textContent = this.formatUptime(health.uptime);
      }

      if (diagnostics && diagnostics.app) {
        const percent = ((diagnostics.app.memoryUsed / diagnostics.app.memoryTotal) * 100).toFixed(1);
        memoryEl.textContent = `${percent}%`;
      }

      // Atualiza eventos
      this.updateEvents(diagnostics);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  updateEvents(diagnostics) {
    const eventsList = document.querySelector('#events-list');
    if (!eventsList) return;

    const events = [];
    
    if (diagnostics?.recentErrors?.length) {
      events.push(...diagnostics.recentErrors.slice(0, 3).map(e => 
        `<p class="text-red-400">✕ ${e.eventType}</p>`
      ));
    }

    if (diagnostics?.health?.checks) {
      const checks = diagnostics.health.checks;
      Object.entries(checks).forEach(([name, check]) => {
        const color = check.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400';
        events.push(`<p class="${color}">● ${name}</p>`);
      });
    }

    eventsList.innerHTML = events.length 
      ? events.join('')
      : '<p class="text-slate-500">Nenhum evento recente</p>';
  }

  refresh() {
    this.loadData();
  }
}
