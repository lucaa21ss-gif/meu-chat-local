import { HttpError } from "./errors/HttpError.js";

export function withTimeout(promise, timeoutMs, errorMessage) {
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

export const DEFAULT_RETRY_DELAYS_MS = [500, 1000, 2000];

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeWithModelRecovery({
  primaryModel,
  fallbackModel,
  maxAttempts,
  timeoutMs,
  retryDelays = DEFAULT_RETRY_DELAYS_MS,
  logger,
  run,
}) {
  const attemptPlan = buildModelAttemptPlan(
    primaryModel,
    fallbackModel,
    maxAttempts,
  );
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

      if (idx < attemptPlan.length - 1) {
        const delayMs =
          retryDelays[idx] ?? retryDelays[retryDelays.length - 1] ?? 1000;
        if (delayMs > 0) await sleep(delayMs);
      }
    }
  }

  throw (
    lastError || new HttpError(502, "Falha ao consultar modelos de inferencia")
  );
}