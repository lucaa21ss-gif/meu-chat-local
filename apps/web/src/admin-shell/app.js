import { createRouter } from './router.js';
import { createAppearance } from './lib/appearance.js';

export function createApp() {
  const router = createRouter();
  const appearance = createAppearance();
  let healthIntervalId = null;
  let refreshHandler = null;
  let mountNode = null;

  function resolveMountNode(target) {
    if (typeof target === 'string') {
      return document.querySelector(target);
    }
    return target || null;
  }

  return {
    mount(target) {
      mountNode = resolveMountNode(target);

      if (!mountNode) {
        throw new Error('AdminShell mount target nao encontrado');
      }

      // Remove loader inicial
      const loader = document.querySelector('#initial-loader');
      if (loader) loader.remove();

      // Renderiza a aplicação
      mountNode.innerHTML = `
        <div class="flex h-screen overflow-hidden bg-[#030712]">
          <!-- Sidebar com navegação -->
          <nav class="w-64 bg-[#0f1216] border-r border-slate-800 flex flex-col overflow-y-auto">
            <div class="p-4 flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center">
                <span class="text-white font-bold text-lg">Ω</span>
              </div>
              <div>
                <h1 class="font-bold text-slate-200">Servidor Local</h1>
                <p class="text-xs text-slate-500">Admin Panel</p>
              </div>
            </div>
            
            <div class="px-4 py-6 flex-1 overflow-y-auto" id="nav-items"></div>
            
            <div class="p-4 border-t border-slate-800 text-xs text-slate-500">
              <p>v1.0.0</p>
              <p class="mt-1 text-cyan-400">● Ativo</p>
            </div>
          </nav>

          <!-- Conteúdo Principal -->
          <main class="flex-1 flex flex-col overflow-hidden">
            <!-- Header com Info Geral -->
            <header class="bg-[#0f1216] border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <div id="page-title" class="flex items-center gap-3">
                <h2 class="text-lg font-bold text-slate-200">Dashboard</h2>
              </div>
              
              <div class="flex items-center gap-4">
                <button id="health-status" class="px-4 py-2 rounded-lg bg-[#051618] border border-cyan-400/30 text-cyan-400 text-sm font-medium hover:border-cyan-400 transition">
                  ● Verificando...
                </button>
                <button id="refresh-btn" class="p-2 rounded-lg bg-[#0a1f1a] hover:bg-[#0f3028] text-slate-400 transition">
                  🔄
                </button>
              </div>
            </header>

            <!-- Conteúdo Dinâmico -->
            <section id="view-container" class="flex-1 overflow-y-auto bg-[#030712]">
              <!-- Conteúdo renderizado aqui -->
            </section>
          </main>
        </div>
      `;

      // Renderiza items de navegação
      router.renderNav('#nav-items');

      // Setup do primeiro view
      router.navigateTo('chat');

      // Event listeners
      refreshHandler = () => {
        router.getCurrentView().refresh?.();
      };

      document.querySelector('#refresh-btn')?.addEventListener('click', refreshHandler);

      // Atualiza status de health a cada 30s
      healthIntervalId = setInterval(() => updateHealthStatus(), 30000);
      updateHealthStatus();
    },

    unmount() {
      if (healthIntervalId) {
        clearInterval(healthIntervalId);
        healthIntervalId = null;
      }

      const refreshButton = document.querySelector('#refresh-btn');
      if (refreshButton && refreshHandler) {
        refreshButton.removeEventListener('click', refreshHandler);
      }
      refreshHandler = null;

      if (mountNode) {
        mountNode.innerHTML = '';
        mountNode = null;
      }
    }
  };
}

async function updateHealthStatus() {
  try {
    const response = await fetch('/api/healthz');
    const data = await response.json();
    const btn = document.querySelector('#health-status');
    
    if (data.status === 'ok') {
      btn.textContent = '● API Saudável';
      btn.className = 'px-4 py-2 rounded-lg bg-[#051a16] border border-emerald-400/30 text-emerald-400 text-sm font-medium';
    } else {
      btn.textContent = '⚠ API com Aviso';
      btn.className = 'px-4 py-2 rounded-lg bg-[#1a1505] border border-amber-400/30 text-amber-400 text-sm font-medium';
    }
  } catch (error) {
    const btn = document.querySelector('#health-status');
    btn.textContent = '✕ API Desconectada';
    btn.className = 'px-4 py-2 rounded-lg bg-[#1a0505] border border-red-400/30 text-red-400 text-sm font-medium';
  }
}
