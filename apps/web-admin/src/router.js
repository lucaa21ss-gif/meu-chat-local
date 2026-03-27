import { createChatView } from './views/chat.js';
import { createDashboardView } from './views/dashboard.js';
import { createHealthView } from './views/health.js';
import { createBackupsView } from './views/backups.js';
import { createUsersView } from './views/users.js';
import { createIncidentsView } from './views/incidents.js';

const views = {
  chat: { label: 'Conversa', icon: '💬', create: createChatView },
  dashboard: { label: 'Dashboard', icon: '📊', create: createDashboardView },
  health: { label: 'Saúde', icon: '🏥', create: createHealthView },
  backups: { label: 'Backups', icon: '💾', create: createBackupsView },
  users: { label: 'Usuários', icon: '👥', create: createUsersView },
  incidents: { label: 'Incidentes', icon: '🚨', create: createIncidentsView },
};

let currentViewKey = null;
let currentViewInstance = null;

export function createRouter() {
  return {
    renderNav(selector) {
      const container = document.querySelector(selector);
      container.innerHTML = Object.entries(views)
        .map(([key, view]) => `
          <button 
            class="nav-item w-full text-left px-4 py-3 rounded-lg mb-2 text-sm text-slate-400 hover:bg-[#1a2331] hover:text-slate-200 transition ${key === 'chat' ? 'bg-[#1a3d5c] text-cyan-400' : ''}"
            data-view="${key}"
          >
            <span class="mr-2">${view.icon}</span>${view.label}
          </button>
        `)
        .join('');

      // Event listeners para navegação
      container.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
          this.navigateTo(btn.dataset.view);
        });
      });
    },

    navigateTo(viewKey) {
      if (!views[viewKey]) return;

      // Remove active state anterior
      document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('bg-[#1a3d5c]', 'text-cyan-400');
      });

      // Adiciona active state novo
      const activeBtn = document.querySelector(`[data-view="${viewKey}"]`);
      if (activeBtn) {
        activeBtn.classList.add('bg-[#1a3d5c]', 'text-cyan-400');
      }

      // Atualiza title
      document.querySelector('#page-title').innerHTML = `
        <span class="text-xl">${views[viewKey].icon}</span>
        <h2 class="text-lg font-bold text-slate-200">${views[viewKey].label}</h2>
      `;

      // Renderiza novo view
      const container = document.querySelector('#view-container');
      const ViewConstructor = views[viewKey].create;
      currentViewInstance = new ViewConstructor();
      container.innerHTML = currentViewInstance.render();
      currentViewInstance.mount(container);

      currentViewKey = viewKey;
    },

    getCurrentView() {
      return currentViewInstance;
    }
  };
}
