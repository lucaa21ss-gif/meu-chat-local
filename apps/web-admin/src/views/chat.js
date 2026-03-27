import { apiClient } from '../lib/api.js';

export class createChatView {
  constructor() {
    this.messages = [];
    this.loading = false;
  }

  render() {
    return `
      <div class="flex flex-col h-full gap-4 p-6">
        <!-- Área de Mensagens -->
        <div class="flex-1 bg-[#0f1216] border border-slate-800 rounded-lg overflow-y-auto p-4" id="messages-container">
          <div class="text-center text-slate-500 py-8">
            <p class="text-lg font-medium">Bem-vindo ao Chat Local</p>
            <p class="text-sm mt-2">Converse com o modelo Ollama rodando localmente</p>
          </div>
        </div>

        <!-- Input de Mensagem -->
        <div class="flex gap-2">
          <input 
            type="text"
            id="chat-input"
            placeholder="Digite sua mensagem... (Shift+Enter para quebra de linha)"
            class="flex-1 bg-[#0f1216] border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition"
          />
          <button 
            id="send-btn"
            class="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/50 transition disabled:opacity-50"
          >
            Enviar
          </button>
        </div>

        <!-- Status -->
        <div id="chat-status" class="text-xs text-slate-500"></div>
      </div>
    `;
  }

  mount(container) {
    const input = container.querySelector('#chat-input');
    const sendBtn = container.querySelector('#send-btn');
    const messagesContainer = container.querySelector('#messages-container');

    // Função para enviar mensagem
    const sendMessage = async () => {
      const text = input.value.trim();
      if (!text) return;

      // Adiciona mensagem do usuário
      this.messages.push({ role: 'user', content: text });
      this.renderMessages(messagesContainer);
      input.value = '';
      input.focus();

      sendBtn.disabled = true;
      this.loading = true;

      try {
        const response = await apiClient.post('/api/chat', {
          userId: 'user-default',
          message: text
        });

        // Adiciona resposta do modelo
        if (response.response) {
          this.messages.push({ role: 'assistant', content: response.response });
          this.renderMessages(messagesContainer);
        }
      } catch (error) {
        this.messages.push({ 
          role: 'system', 
          content: `Erro: ${error.message}` 
        });
        this.renderMessages(messagesContainer);
      } finally {
        sendBtn.disabled = false;
        this.loading = false;
      }
    };

    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  renderMessages(container) {
    container.innerHTML = this.messages.map(msg => {
      const bgClass = msg.role === 'user' 
        ? 'bg-[#1a3d5c] border-cyan-400/30' 
        : msg.role === 'assistant'
        ? 'bg-[#1a1f2e] border-indigo-400/30'
        : 'bg-[#2a1f1f] border-red-400/30';

      return `
        <div class="mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div class="max-w-2xl px-4 py-3 rounded-lg border ${bgClass}">
            <p class="text-sm ${msg.role === 'system' ? 'text-red-400' : 'text-slate-200'}">
              ${this.escapeHtml(msg.content)}
            </p>
          </div>
        </div>
      `;
    }).join('');

    // Scroll para o final
    container.scrollTop = container.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  refresh() {
    this.messages = [];
    const container = document.querySelector('#messages-container');
    if (container) {
      this.renderMessages(container);
    }
  }
}
