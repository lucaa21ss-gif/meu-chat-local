/**
 * Telemetria local opt-in — coleta métricas de latência/erro por endpoint.
 * Nada de conteúdo de mensagens é armazenado aqui.
 */

const stats = new Map();
let enabled = false;

export function isEnabled() {
  return enabled;
}

export function setEnabled(val) {
  enabled = !!val;
}

export function record(method, path, durationMs, isError) {
  const key = `${method} ${path}`;
  const entry = stats.get(key) || {
    method,
    path,
    count: 0,
    errors: 0,
    totalMs: 0,
    lastMs: 0,
  };
  entry.count += 1;
  entry.totalMs += durationMs;
  entry.lastMs = durationMs;
  if (isError) entry.errors += 1;
  stats.set(key, entry);
}

export function getStats() {
  return Array.from(stats.values())
    .sort((a, b) => b.count - a.count)
    .map((e) => ({
      method: e.method,
      path: e.path,
      count: e.count,
      errors: e.errors,
      avgMs: e.count ? Math.round(e.totalMs / e.count) : 0,
      lastMs: e.lastMs,
    }));
}

export function resetStats() {
  stats.clear();
}

/** Middleware Express: mede latência e contabiliza erros por rota. */
export function createTelemetryMiddleware() {
  return (req, res, next) => {
    if (!enabled) return next();
    const start = Date.now();
    const onFinish = () => {
      if (!enabled) {
        res.removeListener("finish", onFinish);
        res.removeListener("close", onFinish);
        return;
      }
      const ms = Date.now() - start;
      // Normaliza o path removendo IDs dinâmicos (UUIDs, IDs numéricos)
      const normalized = req.path
        .replace(/\/chat-[a-z0-9_-]+/gi, "/:chatId")
        .replace(/\/user-[a-z0-9_-]+/gi, "/:userId")
        .replace(/\/[0-9]+/g, "/:id");
      record(req.method, normalized, ms, res.statusCode >= 400);
      res.removeListener("finish", onFinish);
      res.removeListener("close", onFinish);
    };
    res.on("finish", onFinish);
    res.on("close", onFinish);
    next();
  };
}
