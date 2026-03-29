import path from "node:path";
import fs from "node:fs";

export function createAppRuntimeConfig({
  deps,
  serverDir,
  parseOriginList,
  HttpError,
  parsePositiveInt,
  DEFAULT_RETRY_DELAYS_MS,
  buildCorsOriginValidator,
}) {
  const defaultWebDistDir = path.resolve(serverDir, "../web/dist");
  const defaultLegacyWebDir = path.resolve(serverDir, "../web");
  const webDir =
    deps.webDir ||
    (fs.existsSync(defaultWebDistDir) ? defaultWebDistDir : defaultLegacyWebDir);
  const adminWebDir = deps.adminWebDir || path.resolve(serverDir, "../web-admin/dist");
  const corsOrigin = buildCorsOriginValidator(
    deps.allowedOrigin ?? process.env.FRONTEND_ORIGIN,
    parseOriginList,
    HttpError,
  );
  const requestWindowMs = parsePositiveInt(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
    1,
    Number.MAX_SAFE_INTEGER,
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
  const ollamaRetryDelays = Array.isArray(deps.ollamaRetryDelays)
    ? deps.ollamaRetryDelays
    : DEFAULT_RETRY_DELAYS_MS;

  return {
    webDir,
    adminWebDir,
    corsOrigin,
    requestWindowMs,
    ollamaTimeoutMs,
    ollamaMaxAttempts,
    ollamaFallbackModel,
    ollamaRetryDelays,
  };
}
