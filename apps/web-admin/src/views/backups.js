import { apiClient } from '../lib/api.js';

export class createBackupsView {
  render() {
    return `
      <div class="p-6 space-y-6">
        <!-- Ações -->
        <div class="flex gap-3">
          <button id="create-backup-btn" class="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-sm font-medium hover:shadow-lg transition">
            + Criar Backup Agora
          </button>
          <button id="validate-backups-btn" class="px-4 py-2 rounded-lg bg-[#0f1216] border border-slate-700 text-slate-200 text-sm font-medium hover:border-cyan-400 transition">
            ✓ Validar Backups
          </button>
        </div>

        <!-- Lista de Backups -->
        <div class="bg-[#0f1216] border border-slate-800 rounded-lg overflow-hidden">
          <div id="backups-list" class="divide-y divide-slate-800">
            <p class="p-4 text-slate-500 text-sm">Carregando backups...</p>
          </div>
        </div>

        <!-- Status -->
        <div id="backup-status" class="text-xs text-slate-500"></div>
      </div>
    `;
  }

  mount(container) {
    this.loadBackups(container);

    container.querySelector('#create-backup-btn').addEventListener('click', () => {
      this.createBackup(container);
    });

    container.querySelector('#validate-backups-btn').addEventListener('click', () => {
      this.validateBackups(container);
    });
  }

  async loadBackups(container) {
    try {
      const response = await apiClient.get('/api/backup/validate?limit=10');
      const backupsList = container.querySelector('#backups-list');

      if (!response || !response.files) {
        backupsList.innerHTML = '<p class="p-4 text-slate-500 text-sm">Nenhum backup encontrado</p>';
        return;
      }

      const items = response.files.map(file => `
        <div class="p-4 hover:bg-[#0a0f14] transition flex items-center justify-between">
          <div class="flex-1">
            <p class="font-medium text-slate-200">${file.fileName}</p>
            <p class="text-xs text-slate-500 mt-1">
              ${(file.sizeBytes / 1024 / 1024).toFixed(2)} MB • ${new Date(file.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div class="flex gap-2">
            <span class="px-2 py-1 rounded bg-[#051a16] text-emerald-400 text-xs font-medium">
              ${file.validationStatus === 'ok' ? '✓ Válido' : '⚠ Verificar'}
            </span>
            <button class="px-3 py-1 rounded bg-[#0f1216] border border-slate-700 text-slate-400 text-xs hover:border-cyan-400 transition">
              Restaurar
            </button>
          </div>
        </div>
      `).join('');

      backupsList.innerHTML = items || '<p class="p-4 text-slate-500 text-sm">Nenhum backup encontrado</p>';
    } catch (error) {
      const backupsList = container.querySelector('#backups-list');
      backupsList.innerHTML = `<p class="p-4 text-slate-500 text-sm">Erro ao carregar: ${error.message}</p>`;
    }
  }

  async createBackup(container) {
    const btn = container.querySelector('#create-backup-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Criando...';

    try {
      await apiClient.post('/api/backup', {}, { 'x-user-id': 'user-default' });
      await this.loadBackups(container);
      btn.textContent = '✓ Backup criado!';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = '+ Criar Backup Agora';
      }, 2000);
    } catch (error) {
      btn.textContent = '✕ Erro';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = '+ Criar Backup Agora';
      }, 2000);
    }
  }

  async validateBackups(container) {
    try {
      const response = await apiClient.get('/api/backup/validate?limit=10');
      const status = container.querySelector('#backup-status');
      
      const statusText = response.ok ? '✓ Todos os backups estão válidos' 
        : response.alerta ? '⚠ Alguns backups requerem atenção'
        : '✕ Backups inválidos detectados';

      status.textContent = statusText;
      status.className = 'text-sm font-medium mt-4 ' + (
        response.ok ? 'text-emerald-400' : response.alerta ? 'text-amber-400' : 'text-red-400'
      );
    } catch (error) {
      const status = container.querySelector('#backup-status');
      status.textContent = '✕ Erro na validação';
      status.className = 'text-sm font-medium mt-4 text-red-400';
    }
  }

  refresh() {
    const container = document.querySelector('[data-view="backups"]')?.closest('main') || document.querySelector('main');
    if (container) {
      this.loadBackups(container);
    }
  }
}
