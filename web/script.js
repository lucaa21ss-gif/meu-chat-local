const API_BASE = 'http://localhost:3001';

const chatEl = document.getElementById('chat');
const inputEl = document.getElementById('msg');
const typingEl = document.getElementById('typing');
const sendBtnEl = document.getElementById('sendBtn');
const tabsEl = document.getElementById('chatTabs');
const newChatBtnEl = document.getElementById('newChatBtn');
const exportBtnEl = document.getElementById('exportBtn');
const tabsMobileEl = document.getElementById('chatTabsMobile');
const newChatBtnMobileEl = document.getElementById('newChatBtnMobile');
const duplicateBtnEl = document.getElementById('duplicateBtn');
const duplicateBtnMobileEl = document.getElementById('duplicateBtnMobile');
const renameBtnEl = document.getElementById('renameBtn');
const deleteBtnEl = document.getElementById('deleteBtn');
const renameBtnMobileEl = document.getElementById('renameBtnMobile');
const deleteBtnMobileEl = document.getElementById('deleteBtnMobile');
const exportBtnMobileEl = document.getElementById('exportBtnMobile');
const voiceBtnEl = document.getElementById('voiceBtn');
const imageInputEl = document.getElementById('imageInput');
const duplicateModalEl = document.getElementById('duplicateModal');
const duplicateTitleInputEl = document.getElementById('duplicateTitleInput');
const duplicateModeFullEl = document.getElementById('duplicateModeFull');
const duplicateModeUserEl = document.getElementById('duplicateModeUser');
const duplicateCancelBtnEl = document.getElementById('duplicateCancelBtn');
const duplicateConfirmBtnEl = document.getElementById('duplicateConfirmBtn');

const state = {
  chats: [],
  activeChatId: null,
  recognition: null,
  isListening: false,
  duplicateResolver: null
};

function smoothScrollToBottom() {
  chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' });
}

function uid() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function showTyping() {
  typingEl.classList.remove('hidden');
  typingEl.classList.add('flex');
}

function hideTyping() {
  typingEl.classList.add('hidden');
  typingEl.classList.remove('flex');
}

function createAvatar(role) {
  const avatar = document.createElement('div');
  avatar.className = role === 'user'
    ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white'
    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700';
  avatar.textContent = role === 'user' ? 'VOCE' : 'IA';
  return avatar;
}

function appendMessage(role, content, options = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = role === 'user' ? 'flex justify-end' : 'flex justify-start';

  const row = document.createElement('div');
  row.className = role === 'user'
    ? 'flex max-w-[95%] items-end gap-2 sm:max-w-[80%]'
    : 'flex max-w-[95%] items-end gap-2 sm:max-w-[85%]';

  const bubble = document.createElement('article');
  bubble.className = role === 'user'
    ? 'rounded-2xl rounded-br-md bg-teal-600 px-4 py-3 text-sm text-white shadow-sm'
    : 'rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-800 ring-1 ring-slate-200';

  const label = document.createElement('p');
  label.className = role === 'user' ? 'mb-1 text-[11px] font-semibold uppercase tracking-wide text-teal-100' : 'mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500';
  label.textContent = role === 'user' ? 'Usuario' : 'Assistente';

  const contentEl = document.createElement('div');
  contentEl.className = 'whitespace-pre-wrap leading-relaxed';
  contentEl.textContent = content;

  bubble.appendChild(label);
  bubble.appendChild(contentEl);

  if (Array.isArray(options.images) && options.images.length > 0) {
    const preview = document.createElement('img');
    preview.src = options.images[0];
    preview.alt = 'Imagem enviada';
    preview.className = 'mt-2 max-h-52 w-auto rounded-lg border border-white/20 object-contain';
    bubble.appendChild(preview);
  }

  if (role === 'assistant') {
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'mt-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50';
    copyBtn.textContent = 'Copiar resposta';
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(contentEl.textContent || '');
        copyBtn.textContent = 'Copiado';
        setTimeout(() => {
          copyBtn.textContent = 'Copiar resposta';
        }, 1200);
      } catch (err) {
        console.error(err);
      }
    });
    bubble.appendChild(copyBtn);
  }

  if (role === 'user') {
    row.appendChild(bubble);
    row.appendChild(createAvatar(role));
  } else {
    row.appendChild(createAvatar(role));
    row.appendChild(bubble);
  }

  wrapper.appendChild(row);
  chatEl.appendChild(wrapper);
  smoothScrollToBottom();

  return contentEl;
}

function renderTabs() {
  tabsEl.innerHTML = '';
  if (tabsMobileEl) tabsMobileEl.innerHTML = '';

  state.chats.forEach((chat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = chat.id === state.activeChatId
      ? 'w-full rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-left text-sm font-semibold text-teal-700'
      : 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50';

    btn.textContent = chat.title || 'Nova conversa';
    btn.addEventListener('click', () => switchChat(chat.id));
    tabsEl.appendChild(btn);

    if (tabsMobileEl) {
      const compact = document.createElement('button');
      compact.type = 'button';
      compact.className = chat.id === state.activeChatId
        ? 'rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 whitespace-nowrap'
        : 'rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 whitespace-nowrap';
      compact.textContent = chat.title || 'Nova';
      compact.addEventListener('click', () => switchChat(chat.id));
      tabsMobileEl.appendChild(compact);
    }
  });
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function loadChats() {
  const data = await fetchJson('/api/chats');
  state.chats = data.chats || [];

  if (!state.chats.length) {
    await createNewChat('Conversa Principal');
    return;
  }

  if (!state.activeChatId || !state.chats.some((chat) => chat.id === state.activeChatId)) {
    state.activeChatId = state.chats[0].id;
  }

  renderTabs();
  await loadMessages(state.activeChatId);
}

async function loadMessages(chatId) {
  const data = await fetchJson(`/api/chats/${encodeURIComponent(chatId)}/messages`);
  chatEl.innerHTML = '';
  for (const message of data.messages || []) {
    appendMessage(message.role, message.content, { images: message.images });
  }
  hideTyping();
}

async function switchChat(chatId) {
  state.activeChatId = chatId;
  renderTabs();
  await loadMessages(chatId);
}

async function createNewChat(title = 'Nova conversa') {
  const id = uid();
  await fetchJson('/api/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, title })
  });

  await loadChats();
  await switchChat(id);
}

async function renameActiveChat() {
  if (!state.activeChatId) return;
  const current = state.chats.find((chat) => chat.id === state.activeChatId);
  const input = window.prompt('Novo nome da aba:', current?.title || 'Nova conversa');
  if (input === null) return;

  const title = input.trim();
  if (!title) return;

  await fetchJson(`/api/chats/${encodeURIComponent(state.activeChatId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });

  await loadChats();
}

async function duplicateActiveChat() {
  if (!state.activeChatId) return;

  const current = state.chats.find((chat) => chat.id === state.activeChatId);
  const defaultTitle = `${current?.title || 'Conversa'} (copia)`;
  const modalResult = await openDuplicateModal(defaultTitle);
  if (!modalResult) return;

  const title = modalResult.title;
  const id = uid();
  const userOnly = modalResult.userOnly;

  const payload = await fetchJson(`/api/chats/${encodeURIComponent(state.activeChatId)}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, title, userOnly })
  });

  await loadChats();
  await switchChat(payload.chat.id);
}

function getFocusableElements(element) {
  return Array.from(
    element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => !el.hasAttribute('disabled'));
}

function handleModalKeydown(e) {
  if (e.key !== 'Tab') return;

  const focusableElements = getFocusableElements(duplicateModalEl);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (e.shiftKey) {
    if (activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    }
  } else {
    if (activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
}

function closeDuplicateModal(result = null) {
  duplicateModalEl.classList.add('modal-exit-active');
  duplicateModalEl.removeEventListener('keydown', handleModalKeydown);

  setTimeout(() => {
    duplicateModalEl.classList.remove('modal-exit-active');
    duplicateModalEl.classList.add('hidden');
    duplicateModalEl.classList.remove('flex');

    if (state.duplicateResolver) {
      const resolve = state.duplicateResolver;
      state.duplicateResolver = null;
      resolve(result);
    }
  }, 250);
}

function openDuplicateModal(defaultTitle) {
  duplicateTitleInputEl.value = defaultTitle;
  duplicateModeFullEl.checked = true;
  duplicateModeUserEl.checked = false;

  duplicateModalEl.classList.remove('hidden');
  duplicateModalEl.classList.add('flex');
  duplicateModalEl.classList.add('modal-enter-active');
  
  duplicateModalEl.addEventListener('keydown', handleModalKeydown);

  setTimeout(() => {
    duplicateModalEl.classList.remove('modal-enter-active');
    duplicateTitleInputEl.focus();
    duplicateTitleInputEl.select();
  }, 0);

  return new Promise((resolve) => {
    state.duplicateResolver = resolve;
  });
}

async function deleteActiveChat() {
  if (!state.activeChatId) return;
  const currentId = state.activeChatId;
  const confirmed = window.confirm('Deseja excluir esta aba e todas as mensagens?');
  if (!confirmed) return;

  await fetchJson(`/api/chats/${encodeURIComponent(currentId)}`, {
    method: 'DELETE'
  });

  await loadChats();
}

function getControls() {
  const temp = Number.parseFloat(document.getElementById('temp').value);
  const model = document.getElementById('modelo').value;
  const context = Number.parseInt(document.getElementById('ctx').value, 10);

  return {
    temperature: Number.isFinite(temp) ? temp : 0.7,
    model: model || 'meu-llama3',
    context: Number.isFinite(context) ? context : 2048
  };
}

async function imageToBase64(file) {
  if (!file) return null;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      const base64 = value.includes(',') ? value.split(',')[1] : value;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Falha ao converter imagem'));
    reader.readAsDataURL(file);
  });
}

async function enviar() {
  const texto = inputEl.value.trim();
  if (!texto) return;

  if (!state.activeChatId) {
    await createNewChat();
  }

  inputEl.value = '';
  inputEl.focus();
  sendBtnEl.disabled = true;

  const selectedFile = imageInputEl.files?.[0];
  const imageBase64 = selectedFile ? await imageToBase64(selectedFile) : null;
  imageInputEl.value = '';

  appendMessage('user', texto, {
    images: imageBase64 ? [`data:${selectedFile.type};base64,${imageBase64}`] : []
  });
  const iaSpan = appendMessage('assistant', '');
  showTyping();

  try {
    const { temperature, model, context } = getControls();

    const response = await fetch(`${API_BASE}/api/chat-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: state.activeChatId,
        message: texto,
        temperature,
        model,
        context,
        images: imageBase64 ? [imageBase64] : []
      })
    });

    if (!response.ok || !response.body) {
      throw new Error('Falha na resposta do servidor');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      iaSpan.textContent += chunk;
      smoothScrollToBottom();
    }

    await loadChats();
  } catch (error) {
    iaSpan.textContent = 'Nao foi possivel gerar resposta agora. Tente novamente.';
    console.error(error);
  } finally {
    hideTyping();
    sendBtnEl.disabled = false;
  }
}

async function resetar() {
  if (!state.activeChatId) return;
  await fetchJson(`/api/chats/${encodeURIComponent(state.activeChatId)}/reset`, { method: 'POST' });
  chatEl.innerHTML = '';
  hideTyping();
  await loadChats();
}

async function exportChat() {
  if (!state.activeChatId) return;

  const response = await fetch(`${API_BASE}/api/chats/${encodeURIComponent(state.activeChatId)}/export`);
  if (!response.ok) {
    throw new Error('Falha ao exportar conversa');
  }

  const markdown = await response.text();
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${state.activeChatId}.md`;
  anchor.click();

  URL.revokeObjectURL(url);
}

function setupVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceBtnEl.disabled = true;
    voiceBtnEl.textContent = 'Voz indisponivel neste navegador';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      transcript += event.results[i][0].transcript;
    }
    inputEl.value = transcript.trim();
  };

  recognition.onstart = () => {
    state.isListening = true;
    voiceBtnEl.textContent = 'Parar ditado';
  };

  recognition.onend = () => {
    state.isListening = false;
    voiceBtnEl.textContent = 'Iniciar ditado';
  };

  state.recognition = recognition;

  voiceBtnEl.addEventListener('click', () => {
    if (!state.recognition) return;

    if (state.isListening) {
      state.recognition.stop();
      return;
    }

    state.recognition.start();
  });
}

inputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    enviar();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.duplicateResolver) {
    closeDuplicateModal(null);
  }
});

if (duplicateModalEl) {
  duplicateModalEl.addEventListener('click', (event) => {
    if (event.target === duplicateModalEl) {
      closeDuplicateModal(null);
    }
  });
}

if (duplicateCancelBtnEl) {
  duplicateCancelBtnEl.addEventListener('click', () => {
    closeDuplicateModal(null);
  });
}

if (duplicateConfirmBtnEl) {
  duplicateConfirmBtnEl.addEventListener('click', () => {
    const typed = duplicateTitleInputEl.value.trim();
    const title = typed || 'Conversa (copia)';
    const userOnly = duplicateModeUserEl.checked;
    closeDuplicateModal({ title, userOnly });
  });
}

if (newChatBtnEl) {
  newChatBtnEl.addEventListener('click', () => {
    createNewChat();
  });
}

if (newChatBtnMobileEl) {
  newChatBtnMobileEl.addEventListener('click', () => {
    createNewChat();
  });
}

if (renameBtnEl) {
  renameBtnEl.addEventListener('click', () => {
    renameActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (duplicateBtnEl) {
  duplicateBtnEl.addEventListener('click', () => {
    duplicateActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (deleteBtnEl) {
  deleteBtnEl.addEventListener('click', () => {
    deleteActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (renameBtnMobileEl) {
  renameBtnMobileEl.addEventListener('click', () => {
    renameActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (duplicateBtnMobileEl) {
  duplicateBtnMobileEl.addEventListener('click', () => {
    duplicateActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (deleteBtnMobileEl) {
  deleteBtnMobileEl.addEventListener('click', () => {
    deleteActiveChat().catch((err) => {
      console.error(err);
    });
  });
}

if (exportBtnEl) {
  exportBtnEl.addEventListener('click', () => {
    exportChat().catch((err) => {
      console.error(err);
    });
  });
}

if (exportBtnMobileEl) {
  exportBtnMobileEl.addEventListener('click', () => {
    exportChat().catch((err) => {
      console.error(err);
    });
  });
}

window.enviar = enviar;
window.resetar = resetar;

(async function bootstrap() {
  setupVoiceInput();
  await loadChats();
})();
