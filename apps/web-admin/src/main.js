import { api } from "./api-client.js";

async function bootstrap() {
  const root = document.getElementById("app");
  if (!root) return;

  try {
    const health = await api.checkHealth();
    console.log("Kernel Connect Success:", health);
    renderDashboard(root);
  } catch (error) {
    console.error(error);
    renderErrorState(root, error.message);
  }
}

function renderDashboard(root) {
  root.innerHTML = `
    <!-- Sidebar -->
    <aside class="ai-panel w-64 m-4 flex flex-col p-4 animate-slide-up">
      <div class="mb-8">
        <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">
          Admin Console
        </h1>
        <p class="text-xs text-slate-500 mt-1">Status: Conectado</p>
      </div>

      <nav class="flex flex-col gap-2">
        <a href="#" class="px-4 py-2 ai-glass-card hover:-translate-y-0.5 transition-transform text-sm font-semibold text-cyan-300">
          Monitor de Saúde
        </a>
        <a href="#" class="px-4 py-2 hover:bg-slate-800/50 rounded-lg transition-colors text-sm text-slate-400 hover:text-slate-200">
          Incidentes & Logs
        </a>
        <a href="#" class="px-4 py-2 hover:bg-slate-800/50 rounded-lg transition-colors text-sm text-slate-400 hover:text-slate-200">
          Configurações (Kernel)
        </a>
      </nav>

      <div class="mt-auto">
        <div class="p-3 ai-glass-card flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"></div>
          <span class="text-xs font-semibold uppercase tracking-wider text-emerald-400">Sistema Estável</span>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-4 overflow-y-auto hidden-scrollbar relative animate-fade-in">
      <header class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-slate-100">Visão Geral</h2>
        <div class="flex gap-2">
          <button id="btn-force-gc" class="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-500/30 transition-colors">
            Forçar GC (Limpar RAM)
          </button>
        </div>
      </header>

      <!-- Grade de Métricas -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" id="metrics-grid">
        <div class="ai-glass-card p-4 hover-lift">
          <p class="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">Uptime do Servidor</p>
          <div class="text-3xl font-bold text-slate-100" id="stat-uptime">Calculando</div>
        </div>
        <div class="ai-glass-card p-4 border-l-2 border-l-cyan-400 hover-lift">
          <p class="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">Memória (Heap) Usada / Max</p>
          <div class="text-3xl font-bold text-slate-100" id="stat-mem">-- MB</div>
        </div>
        <div class="ai-glass-card p-4 hover-lift">
          <p class="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">Requisições Tráfego Local</p>
          <div class="text-3xl font-bold text-slate-100" id="stat-traffic">--</div>
        </div>
      </div>

      <!-- Tabela Reativa -->
      <div class="ai-panel p-5">
        <h3 class="text-sm font-semibold text-slate-300 mb-4 border-b border-white/5 pb-2">Status dos Nós (Alertas)</h3>
        <div class="flex flex-col gap-3" id="feed-container">
          <!-- Alertas virão via JS -->
           <div class="animate-pulse flex space-x-4"><div class="h-4 bg-slate-700 rounded w-3/4"></div></div>
        </div>
      </div>
    </main>
  `;

  setupInteractions();
  pollMetrics();
  setInterval(pollMetrics, 5000);
}

function setupInteractions() {
  const btnGc = document.getElementById("btn-force-gc");
  if (btnGc) {
    btnGc.addEventListener("click", async (e) => {
      const originalText = e.target.textContent;
      e.target.textContent = "Limpando...";
      e.target.disabled = true;
      try {
        const res = await api.triggerGC();
        if (res.forced) {
          alert(`Garbage Collector invocado com sucesso. Memória liberada: ${res.freedMb} MB.`);
        } else {
          alert(res.message || "A flag '--expose-gc' não está ativa no start do script do node.");
        }
        await pollMetrics(); // Update numbers
      } catch (err) {
        alert("Erro: " + err.message);
      } finally {
        e.target.textContent = originalText;
        e.target.disabled = false;
      }
    });
  }
}

function renderErrorState(root, errorMsg) {
  root.innerHTML = `
    <div class="flex-1 flex flex-col items-center justify-center min-h-screen text-center animate-fade-in">
      <div class="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30 mb-4">
        <svg class="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-slate-100">Servidor Inacessível</h1>
      <p class="text-sm text-slate-400 mt-2 max-w-md">O painel perdeu a comunicação com a API (Kernel) ou o backend encontra-se abatido.</p>
      <div class="mt-6 p-4 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-300 text-xs font-mono text-left w-full max-w-md overflow-hidden">
        > Falha: ${errorMsg}
      </div>
      <button onclick="window.location.reload()" class="mt-6 px-6 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm hover:bg-slate-700 transition">Tentar Reconexão</button>
    </div>
  `;
}

function formatUptime(seconds) {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
}

function formatMb(bytes) {
  return (bytes / 1024 / 1024).toFixed(0);
}

async function pollMetrics() {
  try {
    const fullHealth = await api.getHealthMetrics();
    const liveness = await api.checkHealth();
    
    // Atualiza Uptime global (do Healthz)
    if (liveness && liveness.uptime) {
      document.getElementById("stat-uptime").textContent = formatUptime(liveness.uptime);
    }

    // Atualiza Memória e Ram
    if (fullHealth.memory) {
      const used = formatMb(fullHealth.memory.heapUsed);
      const total = formatMb(fullHealth.memory.heapTotal);
      document.getElementById("stat-mem").textContent = `${used} / ${total} MB`;
    }

    // Traffic Limit Tracker
    if (fullHealth.rateLimiter && fullHealth.rateLimiter.api !== undefined) {
      document.getElementById("stat-traffic").textContent = fullHealth.rateLimiter.api;
    }

    // Alertas (Incidentes)
    const feedEl = document.getElementById("feed-container");
    if (fullHealth.alerts && fullHealth.alerts.length > 0) {
      feedEl.innerHTML = fullHealth.alerts.map(a => `
        <div class="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg flex justify-between items-center mb-2 animate-fade-slide-up">
          <span class="text-sm font-medium text-rose-400">🚨 Alert: ${a}</span>
          <span class="text-xs font-bold text-rose-500 px-2 py-1 bg-rose-500/10 rounded">SYSTEM</span>
        </div>
      `).join('');
    } else {
      feedEl.innerHTML = `
        <div class="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg flex items-center justify-center animate-fade-in">
          <span class="text-sm text-emerald-400 font-medium">Nenhum alerta ativo. Infraestrutura Saudável.</span>
        </div>
      `;
    }

  } catch (error) {
    console.warn("Polling error:", error);
    // Só renderiza a tela de erro fatal se a tela estiver no setup inicial
    const root = document.getElementById("app");
    if (!document.getElementById("stat-uptime")) {
        renderErrorState(root, error.message);
    }
  }
}

bootstrap();
