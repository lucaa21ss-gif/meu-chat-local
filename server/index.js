import express from "express";
import cors from "cors";
import compression from "compression";
import { fileURLToPath } from "node:url";
import path from "node:path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { client } from "./ollama.js";
import logger, { createHttpLogger } from "./logger.js";
import {
  initDb,
  listChats,
  createChat,
  duplicateChat,
  renameChat,
  deleteChat,
  ensureChat,
  getMessages,
  searchMessages,
  appendMessage,
  resetChat,
  exportChatMarkdown,
  renameChatFromFirstMessage,
} from "./db.js";

const CHAT_ID_REGEX = /^[a-zA-Z0-9:_-]{1,80}$/;
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_IMAGES = 4;
const MAX_IMAGE_BASE64_LENGTH = 2_500_000;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertBodyObject(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "Body invalido: esperado JSON objeto");
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseChatId(raw, fieldName = "chatId") {
  const value = String(raw || "").trim();
  if (!value) {
    throw new HttpError(400, `${fieldName} obrigatorio`);
  }
  if (!CHAT_ID_REGEX.test(value)) {
    throw new HttpError(400, `${fieldName} invalido`);
  }
  return value;
}

function getChatId(body = {}) {
  const raw = body.chatId ?? "default";
  return parseChatId(raw, "chatId");
}

function parseTitle(raw, fallback = "Nova conversa") {
  const title = String(raw ?? fallback).trim();
  if (!title) {
    throw new HttpError(400, "Titulo obrigatorio");
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new HttpError(400, `Titulo muito longo (max ${MAX_TITLE_LENGTH})`);
  }
  return title;
}

function parseMessage(body = {}) {
  const message = String(body.message ?? "").trim();
  if (!message) {
    throw new HttpError(400, "Mensagem obrigatoria");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(
      400,
      `Mensagem muito longa (max ${MAX_MESSAGE_LENGTH})`,
    );
  }
  return message;
}

function getMessageImages(body = {}) {
  if (body.images === undefined) return [];
  if (!Array.isArray(body.images)) {
    throw new HttpError(400, "images deve ser uma lista");
  }

  const images = body.images
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .slice(0, MAX_IMAGES);

  for (const image of images) {
    if (image.length > MAX_IMAGE_BASE64_LENGTH) {
      throw new HttpError(400, "Imagem muito grande");
    }
  }

  return images;
}

function parseUserOnly(raw) {
  return raw === true || raw === "true";
}

function parseSearchQuery(raw) {
  const query = String(raw ?? "").trim();
  if (!query) {
    throw new HttpError(400, "Parametro q obrigatorio");
  }
  if (query.length < 2) {
    throw new HttpError(400, "Parametro q deve ter pelo menos 2 caracteres");
  }
  if (query.length > 120) {
    throw new HttpError(400, "Parametro q muito longo (max 120)");
  }
  return query;
}

function parseSearchPage(raw) {
  if (raw === undefined) return 1;
  const page = Number.parseInt(raw, 10);
  if (!Number.isFinite(page) || page < 1) {
    throw new HttpError(400, "Parametro page invalido");
  }
  return page;
}

function parseSearchLimit(raw) {
  if (raw === undefined) return 20;
  const limit = Number.parseInt(raw, 10);
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    throw new HttpError(400, "Parametro limit invalido");
  }
  return limit;
}

function parseSearchRole(raw) {
  const role = String(raw || "all").trim().toLowerCase();
  if (!["all", "user", "assistant"].includes(role)) {
    throw new HttpError(400, "Parametro role invalido");
  }
  return role;
}

function parseSearchDate(raw, fieldName) {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = String(raw).trim();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, `Parametro ${fieldName} invalido`);
  }
  return parsed.toISOString();
}

function parseOptions(body = {}) {
  const temperature = Number.parseFloat(body.temperature);
  const context = Number.parseInt(body.context, 10);
  const safeTemperature = Number.isFinite(temperature)
    ? clamp(temperature, 0, 2)
    : 0.7;
  const safeContext = Number.isFinite(context)
    ? clamp(context, 256, 8192)
    : 2048;
  const model = String(body.model || "meu-llama3").trim() || "meu-llama3";

  return {
    model,
    temperature: safeTemperature,
    num_ctx: safeContext,
  };
}

function parsePositiveInt(raw, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function withTimeout(promise, timeoutMs, errorMessage) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new HttpError(504, errorMessage));
      }, timeoutMs);
    }),
  ]);
}

function buildModelAttemptPlan(primaryModel, fallbackModel, maxAttempts) {
  const primary = String(primaryModel || "").trim();
  const fallback = String(fallbackModel || "").trim();
  const attempts = [];

  if (primary) attempts.push(primary);
  if (fallback && fallback !== primary) attempts.push(fallback);

  if (!attempts.length) attempts.push("meu-llama3");

  while (attempts.length < maxAttempts) {
    attempts.push(attempts[attempts.length - 1]);
  }

  return attempts.slice(0, maxAttempts);
}

async function executeWithModelRecovery({
  primaryModel,
  fallbackModel,
  maxAttempts,
  timeoutMs,
  logger,
  run,
}) {
  const attemptPlan = buildModelAttemptPlan(primaryModel, fallbackModel, maxAttempts);
  let lastError;

  for (let idx = 0; idx < attemptPlan.length; idx += 1) {
    const model = attemptPlan[idx];
    try {
      const result = await withTimeout(
        run(model),
        timeoutMs,
        `Tempo limite excedido ao consultar o modelo ${model}`,
      );

      return { result, modelUsed: model, attempt: idx + 1 };
    } catch (err) {
      lastError = err;
      logger?.warn(
        {
          model,
          attempt: idx + 1,
          maxAttempts: attemptPlan.length,
          error: err.message,
        },
        "Tentativa de inferencia falhou",
      );
    }
  }

  throw lastError || new HttpError(502, "Falha ao consultar modelos de inferencia");
}

function parseOriginList(raw) {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildCorsOriginValidator(configuredOrigin) {
  if (configuredOrigin === true || configuredOrigin === false) {
    return configuredOrigin;
  }

  const configuredOrigins = Array.isArray(configuredOrigin)
    ? configuredOrigin.map((origin) => String(origin).trim()).filter(Boolean)
    : parseOriginList(configuredOrigin);

  const allowlist = new Set(
    configuredOrigins.length
      ? configuredOrigins
      : ["http://localhost:3001", "http://127.0.0.1:3001"],
  );

  return (origin, callback) => {
    // Requests sem header Origin (curl, health checks e chamadas same-origin)
    // continuam permitidos.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowlist.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new HttpError(403, "Origem nao permitida pelo CORS"));
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
    searchMessages: deps.searchMessages || searchMessages,
    appendMessage: deps.appendMessage || appendMessage,
    resetChat: deps.resetChat || resetChat,
    exportChatMarkdown: deps.exportChatMarkdown || exportChatMarkdown,
    renameChatFromFirstMessage:
      deps.renameChatFromFirstMessage || renameChatFromFirstMessage,
  };

  const app = express();
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  const webDir = deps.webDir || path.resolve(serverDir, "../web");
  const corsOrigin = buildCorsOriginValidator(
    deps.allowedOrigin ?? process.env.FRONTEND_ORIGIN,
  );
  const requestWindowMs = Number.parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`,
    10,
  );
  const requestLimit = Number.parseInt(process.env.RATE_LIMIT_MAX || "400", 10);
  const chatRequestLimit = Number.parseInt(
    process.env.RATE_LIMIT_CHAT_MAX || "80",
    10,
  );
  const ollamaTimeoutMs = parsePositiveInt(
    deps.ollamaTimeoutMs ?? process.env.OLLAMA_TIMEOUT_MS,
    45_000,
    1_000,
    120_000,
  );
  const ollamaMaxAttempts = parsePositiveInt(
    deps.ollamaMaxAttempts ?? process.env.OLLAMA_MAX_ATTEMPTS,
    2,
    1,
    3,
  );
  const ollamaFallbackModel = String(
    deps.ollamaFallbackModel ?? process.env.OLLAMA_FALLBACK_MODEL ?? "",
  ).trim();

  const apiLimiter = rateLimit({
    windowMs: Number.isFinite(requestWindowMs)
      ? requestWindowMs
      : 15 * 60 * 1000,
    max: Number.isFinite(requestLimit) ? requestLimit : 400,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisicoes, tente novamente em alguns minutos" },
  });

  const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number.isFinite(chatRequestLimit) ? chatRequestLimit : 80,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Limite de chat excedido temporariamente" },
  });

  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: process.env.JSON_LIMIT || "8mb" }));

  // Response compression for JSON and text
  app.use(compression());

  // HTTP logging with trace IDs
  app.use(createHttpLogger());
  app.use((req, res, next) => {
    req.logger = logger.child({ traceId: req.id });
    next();
  });

  // Cache headers for static assets
  app.use(
    express.static(webDir, {
      maxAge: "1d",
      etag: false,
      dotfiles: "ignore",
    }),
  );

  app.use("/api", apiLimiter);
  app.use("/api/chat", chatLimiter);
  app.use("/api/chat-stream", chatLimiter);

  app.get("/healthz", (req, res) => {
    req.logger?.info({ uptime: process.uptime() }, "Liveness check");
    res.status(200).json({ status: "ok", service: "chat-server" });
  });

  app.get(
    "/readyz",
    asyncHandler(async (req, res) => {
      const startTime = Date.now();
      try {
        await store.listChats();
        const duration = Date.now() - startTime;
        req.logger?.info({ duration }, "Readiness check passed");
        res.status(200).json({
          status: "ready",
          uptime: process.uptime(),
          responseTime: duration,
        });
      } catch (err) {
        const duration = Date.now() - startTime;
        req.logger?.error(
          { error: err.message, duration },
          "Readiness check failed",
        );
        throw err;
      }
    }),
  );

  app.post(
    "/api/chat",
    asyncHandler(async (req, res) => {
      assertBodyObject(req.body);
      const message = parseMessage(req.body);
      const chatId = getChatId(req.body);
      const options = parseOptions(req.body);
      const images = getMessageImages(req.body);

      await store.ensureChat(chatId);
      await store.appendMessage(chatId, "user", message, images);
      await store.renameChatFromFirstMessage(chatId, message);

      const history = await store.getMessages(chatId);
      const payload = {
        messages: history.map((item) => ({
          role: item.role,
          content: item.content,
          ...(item.images?.length ? { images: item.images } : {}),
        })),
        options: {
          temperature: options.temperature,
          num_ctx: options.num_ctx,
        },
      };

      const { result: response, modelUsed, attempt } =
        await executeWithModelRecovery({
          primaryModel: options.model,
          fallbackModel: ollamaFallbackModel,
          maxAttempts: ollamaMaxAttempts,
          timeoutMs: ollamaTimeoutMs,
          logger: req.logger,
          run: (model) => chatClient.chat({ ...payload, model }),
        });

      req.logger?.info({ modelUsed, attempt }, "Inferencia concluida");

      const reply = String(response.message?.content || "");
      await store.appendMessage(chatId, "assistant", reply);

      res.json({ reply, chatId });
    }),
  );

  app.post(
    "/api/reset",
    asyncHandler(async (_req, res) => {
      await store.resetChat("default");
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/chats",
    asyncHandler(async (_req, res) => {
      const chats = await store.listChats();
      res.json({ chats });
    }),
  );

  app.post(
    "/api/chats",
    asyncHandler(async (req, res) => {
      assertBodyObject(req.body);
      const generatedId = `chat-${Date.now()}`;
      const id = parseChatId(req.body.id || generatedId, "id");
      const title = parseTitle(req.body.title, "Nova conversa");
      const created = await store.createChat(id, title);
      res.status(201).json({ chat: created });
    }),
  );

  app.post(
    "/api/chats/:chatId/duplicate",
    asyncHandler(async (req, res) => {
      assertBodyObject(req.body);

      const sourceId = parseChatId(req.params.chatId, "chatId");
      const generatedId = `chat-${Date.now()}`;
      const targetId = parseChatId(req.body.id || generatedId, "id");
      const title =
        req.body.title === undefined
          ? undefined
          : parseTitle(req.body.title, "Nova conversa");
      const userOnly = parseUserOnly(req.body.userOnly);

      const cloned = await store.duplicateChat(sourceId, targetId, title, {
        userOnly,
      });
      if (!cloned) {
        throw new HttpError(404, "Chat de origem nao encontrado");
      }

      return res.status(201).json({ chat: cloned });
    }),
  );

  app.patch(
    "/api/chats/:chatId",
    asyncHandler(async (req, res) => {
      assertBodyObject(req.body);
      const chatId = parseChatId(req.params.chatId, "chatId");
      const title = parseTitle(req.body.title, "Nova conversa");

      const updated = await store.renameChat(chatId, title);
      if (!updated) {
        throw new HttpError(404, "Chat nao encontrado");
      }

      return res.json({ chat: updated });
    }),
  );

  app.delete(
    "/api/chats/:chatId",
    asyncHandler(async (req, res) => {
      const chatId = parseChatId(req.params.chatId, "chatId");
      const deleted = await store.deleteChat(chatId);
      if (!deleted) {
        throw new HttpError(404, "Chat nao encontrado");
      }

      return res.json({ ok: true });
    }),
  );

  app.get(
    "/api/chats/:chatId/messages",
    asyncHandler(async (req, res) => {
      const chatId = parseChatId(req.params.chatId, "chatId");
      const messages = await store.getMessages(chatId);
      res.json({ messages });
    }),
  );

  app.get(
    "/api/chats/:chatId/search",
    asyncHandler(async (req, res) => {
      const chatId = parseChatId(req.params.chatId, "chatId");
      const query = parseSearchQuery(req.query?.q);
      const page = parseSearchPage(req.query?.page);
      const limit = parseSearchLimit(req.query?.limit);
      const role = parseSearchRole(req.query?.role);
      const from = parseSearchDate(req.query?.from, "from");
      const to = parseSearchDate(req.query?.to, "to");

      if (from && to && new Date(from) > new Date(to)) {
        throw new HttpError(400, "Parametro from nao pode ser maior que to");
      }

      const result = await store.searchMessages(chatId, query, {
        page,
        limit,
        role,
        from,
        to,
      });

      res.json({
        matches: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    }),
  );

  app.post(
    "/api/chats/:chatId/reset",
    asyncHandler(async (req, res) => {
      const chatId = parseChatId(req.params.chatId, "chatId");
      await store.resetChat(chatId);
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/chats/:chatId/export",
    asyncHandler(async (req, res) => {
      const chatId = parseChatId(req.params.chatId, "chatId");
      const markdown = await store.exportChatMarkdown(chatId);
      if (!markdown) {
        throw new HttpError(404, "Chat nao encontrado");
      }

      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="chat-${chatId}.md"`,
      );
      return res.send(markdown);
    }),
  );

  app.post("/api/chat-stream", async (req, res) => {
    try {
      assertBodyObject(req.body);

      const message = parseMessage(req.body);
      const chatId = getChatId(req.body);
      const options = parseOptions(req.body);
      const images = getMessageImages(req.body);

      await store.ensureChat(chatId);
      await store.appendMessage(chatId, "user", message, images);
      await store.renameChatFromFirstMessage(chatId, message);

      const history = await store.getMessages(chatId);

      let fullReply = "";

      const payload = {
        messages: history.map((item) => ({
          role: item.role,
          content: item.content,
          ...(item.images?.length ? { images: item.images } : {}),
        })),
        stream: true,
        options: {
          temperature: options.temperature,
          num_ctx: options.num_ctx,
        },
      };

      const { result: stream, modelUsed, attempt } = await executeWithModelRecovery({
        primaryModel: options.model,
        fallbackModel: ollamaFallbackModel,
        maxAttempts: ollamaMaxAttempts,
        timeoutMs: ollamaTimeoutMs,
        logger: req.logger,
        run: (model) => chatClient.chat({ ...payload, model }),
      });

      req.logger?.info({ modelUsed, attempt }, "Streaming iniciado");

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");

      for await (const part of stream) {
        const chunk = part.message?.content ?? part.delta?.content ?? "";

        if (!chunk) continue;

        fullReply += chunk;
        res.write(chunk);
      }

      await store.appendMessage(chatId, "assistant", fullReply);
      res.end();
    } catch (err) {
      if (!res.headersSent) {
        const status = err instanceof HttpError ? err.status : 500;
        const message =
          err instanceof HttpError ? err.message : "Erro no streaming";
        res.status(status).json({ error: message });
        return;
      }
      res.end();
    }
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Endpoint nao encontrado" });
  });

  app.get("/app", (_req, res) => {
    res.sendFile(path.join(webDir, "index.html"));
  });

  app.get("/produto", (_req, res) => {
    res.sendFile(path.join(webDir, "produto.html"));
  });

  app.get("/guia", (_req, res) => {
    res.sendFile(path.join(webDir, "guia.html"));
  });

  app.get("/", (_req, res) => {
    res.sendFile(path.join(webDir, "index.html"));
  });

  app.use((err, req, res) => {
    const status = err instanceof HttpError ? err.status : 500;
    const message =
      err instanceof HttpError ? err.message : "Erro interno do servidor";

    req.logger?.error(
      {
        error: err.message,
        stack: err.stack,
        traceId: req.id,
      },
      `${status} ${message}`,
    );

    if (res.headersSent) {
      return;
    }

    if (req.path.startsWith("/api")) {
      res.status(status).json({ error: message });
      return;
    }

    res.status(status).send(message);
  });

  return app;
}

export async function startServer(port = 3001) {
  await initDb();
  const app = createApp();
  const server = app.listen(port, () => {
    logger.info(`API rodando em http://localhost:${port}`);
  });
  return server;
}

const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  startServer().catch((err) => {
    logger.error(err, "Falha ao inicializar servidor");
    process.exit(1);
  });
}
