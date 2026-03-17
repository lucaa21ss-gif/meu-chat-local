/**
 * Rate limiter com fila por papel de usuario.
 *
 * Cada requisicao e identificada pelo userId (header x-user-id).
 * Quando o limite da janela deslizante por papel e excedido, a requisicao
 * entra na fila global. Quando a fila estiver cheia, retorna 503.
 * Requisicoes que aguardam por mais de queueTimeoutMs recebem 429.
 */

export const ROLE_LIMITS_DEFAULTS = {
  admin:    { windowMs: 15 * 60 * 1000, max: 300, chatMax: 100 },
  operator: { windowMs: 15 * 60 * 1000, max: 150, chatMax:  50 },
  viewer:   { windowMs: 15 * 60 * 1000, max:  60, chatMax:  20 },
};

/**
 * @param {object} opts
 * @param {object}   [opts.roleLimits]          - Override de limites por papel.
 * @param {number}   [opts.queueMax=30]         - Tamanho maximo da fila global.
 * @param {number}   [opts.queueTimeoutMs=8000] - Timeout por item na fila (ms).
 * @param {Function} [opts.getRoleForUser]      - async (userId) => role string.
 */
export function createRoleLimiterQueue(opts = {}) {
  const roleLimits = { ...ROLE_LIMITS_DEFAULTS, ...(opts.roleLimits || {}) };
  const queueMax       = opts.queueMax       ?? 30;
  const queueTimeoutMs = opts.queueTimeoutMs ?? 8_000;
  const getRoleForUser = opts.getRoleForUser;

  // Contadores de janela deslizante por userId
  // Map<userId, { count: number, windowStart: number }>
  const counters = new Map();

  // Fila pendente por userId
  // Map<userId, Array<{ timer, resolve }>>
  const pendingByUser = new Map();

  let queuedTotal   = 0;
  let rejectedTotal = 0;
  let timedOutTotal = 0;

  function getLimits(role, type) {
    const cfg = roleLimits[role] ?? roleLimits.viewer ?? { windowMs: 15 * 60 * 1000, max: 60, chatMax: 20 };
    return {
      windowMs: cfg.windowMs,
      max: type === "chat" ? (cfg.chatMax ?? Math.ceil(cfg.max / 3)) : cfg.max,
    };
  }

  function getCount(userId, windowMs) {
    const entry = counters.get(userId);
    if (!entry) return 0;
    if (Date.now() - entry.windowStart >= windowMs) return 0;
    return entry.count;
  }

  function addCount(userId, windowMs) {
    const now   = Date.now();
    const entry = counters.get(userId);
    if (!entry || now - entry.windowStart >= windowMs) {
      counters.set(userId, { count: 1, windowStart: now });
    } else {
      entry.count += 1;
    }
  }

  function totalQueueSize() {
    let total = 0;
    for (const items of pendingByUser.values()) total += items.length;
    return total;
  }

  function drainQueue(userId, windowMs, max) {
    const pending = pendingByUser.get(userId);
    if (!pending || pending.length === 0) return;

    // Reseta janela deslizante
    counters.delete(userId);

    const toServe = Math.min(pending.length, max);
    const served  = pending.splice(0, toServe);
    if (pending.length === 0) pendingByUser.delete(userId);

    for (const item of served) {
      addCount(userId, windowMs);
      item.resolve("proceed");
    }

    // Se ainda ha itens pendentes, agenda proximo dreno
    const remaining = pendingByUser.get(userId);
    if (remaining && remaining.length > 0) {
      setTimeout(() => drainQueue(userId, windowMs, max), windowMs);
    }
  }

  function enqueueItem(userId, windowMs, max, item) {
    const wasEmpty =
      !pendingByUser.has(userId) || pendingByUser.get(userId).length === 0;
    if (!pendingByUser.has(userId)) pendingByUser.set(userId, []);
    pendingByUser.get(userId).push(item);

    if (wasEmpty) {
      // Primeiro item da fila: agenda dreno quando a janela resetar
      const entry = counters.get(userId);
      const delay = entry
        ? Math.max(1, windowMs - (Date.now() - entry.windowStart))
        : 1;
      setTimeout(() => drainQueue(userId, windowMs, max), delay);
    }
  }

  /** Retorna metricas para o painel de saude. */
  function getMetrics() {
    return {
      currentQueueSize: totalQueueSize(),
      queueMax,
      queuedTotal,
      rejectedTotal,
      timedOutTotal,
    };
  }

  /**
   * Cria middleware Express para o tipo de rota ('api' | 'chat').
   */
  function createMiddleware(type = "api") {
    return async (req, res, next) => {
      const userId = String(req.headers["x-user-id"] || req.ip || "anon");

      let role = "viewer";
      if (getRoleForUser) {
        try {
          role = String((await getRoleForUser(userId)) || "viewer");
        } catch {
          role = "viewer";
        }
      }

      const { windowMs, max } = getLimits(role, type);
      const current = getCount(userId, windowMs);

      if (current < max) {
        addCount(userId, windowMs);
        return next();
      }

      // Limite excedido
      if (totalQueueSize() >= queueMax) {
        rejectedTotal++;
        return res.status(503).json({
          error: "Servico sobrecarregado, tente novamente em instantes",
          retryAfterMs: windowMs,
        });
      }

      // Enfileira a requisicao
      queuedTotal++;
      return new Promise((outerResolve) => {
        let done = false;

        const timer = setTimeout(() => {
          if (done) return;
          done = true;

          const userPending = pendingByUser.get(userId);
          if (userPending) {
            const idx = userPending.findIndex((item) => item.timer === timer);
            if (idx !== -1) userPending.splice(idx, 1);
            if (userPending.length === 0) pendingByUser.delete(userId);
          }

          timedOutTotal++;
          if (!res.headersSent) {
            res.status(429).json({
              error: "Tempo de espera na fila excedido",
              retryAfterMs: windowMs,
            });
          }
          outerResolve();
        }, queueTimeoutMs);

        const item = {
          timer,
          resolve: (signal) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            if (signal === "proceed" && !res.headersSent) {
              next();
            }
            outerResolve();
          },
        };

        enqueueItem(userId, windowMs, max, item);
      });
    };
  }

  return { createMiddleware, getMetrics };
}
