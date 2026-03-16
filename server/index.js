import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { client } from './ollama.js';
import {
  initDb,
  listChats,
  createChat,
  duplicateChat,
  renameChat,
  deleteChat,
  ensureChat,
  getMessages,
  appendMessage,
  resetChat,
  exportChatMarkdown,
  renameChatFromFirstMessage
} from './db.js';

function getChatId(body = {}) {
  const value = String(body.chatId || 'default').trim();
  return value || 'default';
}

function getMessageImages(body = {}) {
  if (!Array.isArray(body.images)) return [];
  return body.images
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .slice(0, 4);
}

function parseOptions(body = {}) {
  const temperature = Number.parseFloat(body.temperature);
  const context = Number.parseInt(body.context, 10);

  return {
    model: body.model || 'meu-llama3',
    temperature: Number.isFinite(temperature) ? temperature : 0.7,
    num_ctx: Number.isFinite(context) ? context : 2048
  };
}

export function createApp(deps = {}) {
  const chatClient = deps.chatClient || client;
  const store = {
    initDb: deps.initDb || initDb,
    listChats: deps.listChats || listChats,
    createChat: deps.createChat || createChat,
    duplicateChat: deps.duplicateChat || duplicateChat,
    renameChat: deps.renameChat || renameChat,
    deleteChat: deps.deleteChat || deleteChat,
    ensureChat: deps.ensureChat || ensureChat,
    getMessages: deps.getMessages || getMessages,
    appendMessage: deps.appendMessage || appendMessage,
    resetChat: deps.resetChat || resetChat,
    exportChatMarkdown: deps.exportChatMarkdown || exportChatMarkdown,
    renameChatFromFirstMessage: deps.renameChatFromFirstMessage || renameChatFromFirstMessage
  };

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post('/api/chat', async (req, res) => {
    try {
      const { message } = req.body;
      const chatId = getChatId(req.body);
      const options = parseOptions(req.body);
      const images = getMessageImages(req.body);

      await store.ensureChat(chatId);
      await store.appendMessage(chatId, 'user', message, images);
      await store.renameChatFromFirstMessage(chatId, message);

      const history = await store.getMessages(chatId);
      const response = await chatClient.chat({
        model: options.model,
        messages: history.map((item) => ({
          role: item.role,
          content: item.content,
          ...(item.images?.length ? { images: item.images } : {})
        })),
        options: {
          temperature: options.temperature,
          num_ctx: options.num_ctx
        }
      });

      const reply = response.message.content;
      await store.appendMessage(chatId, 'assistant', reply);

      res.json({ reply, chatId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Falha ao processar chat' });
    }
  });

  app.post('/api/reset', (req, res) => {
    store.resetChat('default')
      .then(() => res.json({ ok: true }))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: 'Falha ao limpar historico' });
      });
  });

  app.get('/api/chats', async (_req, res) => {
    try {
      const chats = await store.listChats();
      res.json({ chats });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Falha ao listar chats' });
    }
  });

  app.post('/api/chats', async (req, res) => {
    try {
      const id = String(req.body.id || `chat-${Date.now()}`).trim();
      const title = req.body.title || 'Nova conversa';
      const created = await store.createChat(id, title);
      res.status(201).json({ chat: created });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Falha ao criar chat' });
    }
  });

  app.post('/api/chats/:chatId/duplicate', async (req, res) => {
    try {
      const sourceId = req.params.chatId;
      const targetId = String(req.body.id || `chat-${Date.now()}`).trim();
      const title = req.body.title;
      const userOnly = Boolean(req.body.userOnly);

      const cloned = await store.duplicateChat(sourceId, targetId, title, { userOnly });
      if (!cloned) {
        return res.status(404).json({ error: 'Chat de origem nao encontrado' });
      }

      return res.status(201).json({ chat: cloned });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Falha ao duplicar chat' });
    }
  });

  app.patch('/api/chats/:chatId', async (req, res) => {
    try {
      const title = String(req.body.title || '').trim();
      if (!title) {
        return res.status(400).json({ error: 'Titulo obrigatorio' });
      }

      const updated = await store.renameChat(req.params.chatId, title);
      if (!updated) {
        return res.status(404).json({ error: 'Chat nao encontrado' });
      }

      return res.json({ chat: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Falha ao renomear chat' });
    }
  });

  app.delete('/api/chats/:chatId', async (req, res) => {
    try {
      const deleted = await store.deleteChat(req.params.chatId);
      if (!deleted) {
        return res.status(404).json({ error: 'Chat nao encontrado' });
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Falha ao excluir chat' });
    }
  });

  app.get('/api/chats/:chatId/messages', async (req, res) => {
    try {
      const messages = await store.getMessages(req.params.chatId);
      res.json({ messages });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Falha ao carregar mensagens' });
    }
  });

  app.post('/api/chats/:chatId/reset', async (req, res) => {
    try {
      await store.resetChat(req.params.chatId);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Falha ao resetar chat' });
    }
  });

  app.get('/api/chats/:chatId/export', async (req, res) => {
    try {
      const markdown = await store.exportChatMarkdown(req.params.chatId);
      if (!markdown) {
        return res.status(404).json({ error: 'Chat nao encontrado' });
      }

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="chat-${req.params.chatId}.md"`
      );
      return res.send(markdown);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Falha ao exportar chat' });
    }
  });

  app.post('/api/chat-stream', async (req, res) => {
    try {
      const { message } = req.body;
      const chatId = getChatId(req.body);
      const options = parseOptions(req.body);
      const images = getMessageImages(req.body);

      await store.ensureChat(chatId);
      await store.appendMessage(chatId, 'user', message, images);
      await store.renameChatFromFirstMessage(chatId, message);

      const history = await store.getMessages(chatId);

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      let fullReply = '';

      const stream = await chatClient.chat({
        model: options.model,
        messages: history.map((item) => ({
          role: item.role,
          content: item.content,
          ...(item.images?.length ? { images: item.images } : {})
        })),
        stream: true,
        options: {
          temperature: options.temperature,
          num_ctx: options.num_ctx
        }
      });

      for await (const part of stream) {
        const chunk =
          part.message?.content ??
          part.delta?.content ??
          '';

        if (!chunk) continue;

        fullReply += chunk;
        res.write(chunk);
      }

      await store.appendMessage(chatId, 'assistant', fullReply);
      res.end();
    } catch (err) {
      console.error(err);
      res.status(500).end('Erro no streaming');
    }
  });

  return app;
}

export async function startServer(port = 3001) {
  await initDb();
  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}`);
  });
  return server;
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  startServer().catch((err) => {
    console.error('Falha ao inicializar servidor', err);
    process.exit(1);
  });
}
