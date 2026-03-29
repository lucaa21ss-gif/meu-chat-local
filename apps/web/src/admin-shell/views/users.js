import { apiClient } from '../lib/api.js';

export class createUsersView {
  render() {
    return `
      <div class="p-6 space-y-6">
        <!-- Ação de Criar -->
        <button id="add-user-btn" class="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-sm font-medium hover:shadow-lg transition">
          + Novo Usuário
        </button>

        <!-- Lista de Usuários -->
        <div class="bg-[#0f1216] border border-slate-800 rounded-lg overflow-hidden">
          <div id="users-list" class="divide-y divide-slate-800">
            <p class="p-4 text-slate-500 text-sm">Carregando usuários...</p>
          </div>
        </div>
      </div>
    `;
  }

  mount(container) {
    this.loadUsers(container);

    container.querySelector('#add-user-btn').addEventListener('click', () => {
      this.showAddUserModal();
    });
  }

  async loadUsers(container) {
    try {
      const response = await apiClient.get('/api/users', { 'x-user-id': 'user-default' });
      const usersList = container.querySelector('#users-list');

      if (!response || !Array.isArray(response)) {
        usersList.innerHTML = '<p class="p-4 text-slate-500 text-sm">Nenhum usuário encontrado</p>';
        return;
      }

      const items = response.map(user => {
        const roleColors = {
          admin: 'bg-red-500/10 text-red-400',
          operator: 'bg-amber-500/10 text-amber-400',
          viewer: 'bg-blue-500/10 text-blue-400'
        };

        return `
          <div class="p-4 hover:bg-[#0a0f14] transition flex items-center justify-between">
            <div class="flex-1">
              <p class="font-medium text-slate-200">${user.name}</p>
              <p class="text-xs text-slate-500 mt-1">ID: ${user.id}</p>
            </div>
            <div class="flex gap-3 items-center">
              <span class="px-3 py-1 rounded text-xs font-medium ${roleColors[user.role] || roleColors.viewer}">
                ${user.role}
              </span>
              <button class="px-3 py-1 rounded bg-[#0f1216] border border-slate-700 text-slate-400 text-xs hover:border-cyan-400 transition">
                Editar
              </button>
            </div>
          </div>
        `;
      }).join('');

      usersList.innerHTML = items || '<p class="p-4 text-slate-500 text-sm">Nenhum usuário</p>';
    } catch (error) {
      const usersList = container.querySelector('#users-list');
      usersList.innerHTML = `<p class="p-4 text-slate-500 text-sm">Erro: ${error.message}</p>`;
    }
  }

  showAddUserModal() {
    alert('Modal de novo usuário (a implementar)');
  }

  refresh() {
    const container = document.querySelector('main');
    if (container) {
      this.loadUsers(container);
    }
  }
}
