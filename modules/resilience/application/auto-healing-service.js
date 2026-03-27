import logger from "../../../platform/observability/logging/logger.js";
import { HttpError } from "../../../shared/kernel/errors/HttpError.js";
import {
  AUTO_HEALING_POLICIES,
  HEALTH_STATUS,
} from "../../../shared/config/app-constants.js";
import { executeWithModelRecovery } from "../../../shared/kernel/model-recovery.js";
import { parseBooleanLike, parsePositiveInt } from "../../../shared/config/parsers.js";

export function createDefaultAutoHealingService({
  healthProviders,
  store,
  chatClient,
  ollamaFallbackModel,
  ollamaMaxAttempts,
  ollamaTimeoutMs,
  ollamaRetryDelays,
  state: config = {},
} = {}) {
  const policyState = {
    "model-offline": {
      lastAttemptAt: null,
      lastOutcome: "idle",
      lastError: null,
      trigger: null,
      failureTimestamps: [],
      nextAllowedAtMs: 0,
      details: null,
    },
    "db-lock": {
      lastAttemptAt: null,
      lastOutcome: "idle",
      lastError: null,
      trigger: null,
      failureTimestamps: [],
      nextAllowedAtMs: 0,
      details: null,
    },
  };

  const state = {
    enabled: parseBooleanLike(config.enabled, false),
    cooldownMs: parsePositiveInt(config.cooldownMs, 30_000, 0, 3_600_000),
    maxAttempts: parsePositiveInt(config.maxAttempts, 3, 1, 20),
    windowMs: parsePositiveInt(config.windowMs, 300_000, 1_000, 86_400_000),
    paused: false,
    pausedReason: null,
    lastEvaluation: null,
    updatedAt: new Date().toISOString(),
  };

  function pruneFailures(policy, nowMs) {
    const threshold = nowMs - state.windowMs;
    policyState[policy].failureTimestamps = policyState[policy].failureTimestamps.filter(
      (timestamp) => timestamp >= threshold,
    );
  }

  function getStatus() {
    return {
      enabled: state.enabled,
      cooldownMs: state.cooldownMs,
      maxAttempts: state.maxAttempts,
      windowMs: state.windowMs,
      paused: state.paused,
      pausedReason: state.pausedReason,
      updatedAt: state.updatedAt,
      lastEvaluation: state.lastEvaluation,
      policies: Object.fromEntries(
        AUTO_HEALING_POLICIES.map((policy) => {
          const current = policyState[policy];
          return [
            policy,
            {
              lastAttemptAt: current.lastAttemptAt,
              lastOutcome: current.lastOutcome,
              lastError: current.lastError,
              trigger: current.trigger,
              recentFailures: current.failureTimestamps.length,
              nextAllowedAt:
                current.nextAllowedAtMs > 0
                  ? new Date(current.nextAllowedAtMs).toISOString()
                  : null,
              details: current.details,
            },
          ];
        }),
      ),
    };
  }

  function patchConfig(patch = {}) {
    if (patch.enabled !== undefined) state.enabled = !!patch.enabled;
    if (patch.cooldownMs !== undefined) state.cooldownMs = patch.cooldownMs;
    if (patch.maxAttempts !== undefined) state.maxAttempts = patch.maxAttempts;
    if (patch.windowMs !== undefined) state.windowMs = patch.windowMs;
    if (patch.resetCircuit) {
      state.paused = false;
      state.pausedReason = null;
      for (const policy of AUTO_HEALING_POLICIES) {
        policyState[policy].failureTimestamps = [];
      }
    }
    state.updatedAt = new Date().toISOString();
    return getStatus();
  }

  async function runPolicyAction(policy) {
    if (policy === "model-offline") {
      const { modelUsed, attempt } = await executeWithModelRecovery({
        primaryModel: "meu-llama3",
        fallbackModel: ollamaFallbackModel,
        maxAttempts: ollamaMaxAttempts,
        timeoutMs: Math.min(ollamaTimeoutMs, 10_000),
        retryDelays: ollamaRetryDelays,
        logger,
        run: (model) =>
          chatClient.chat({
            model,
            stream: false,
            messages: [{ role: "user", content: "auto-healing ping" }],
            options: { temperature: 0, num_ctx: 256 },
          }),
      });
      return { modelUsed, attempt };
    }

    if (policy === "db-lock") {
      await store.listChats("user-default", { limit: 1 });
      return { dbProbe: "listChats" };
    }

    throw new HttpError(400, "Politica de auto-healing nao suportada");
  }

  async function executePolicy(policy, { trigger = "manual", healthChecks = null } = {}) {
    const current = policyState[policy];
    const nowMs = Date.now();

    if (!state.enabled) {
      const result = {
        executed: false,
        policy,
        outcome: "skipped",
        reason: "disabled",
        at: new Date(nowMs).toISOString(),
      };
      state.lastEvaluation = result;
      return result;
    }

    if (state.paused) {
      const result = {
        executed: false,
        policy,
        outcome: "skipped",
        reason: "circuit-open",
        at: new Date(nowMs).toISOString(),
      };
      state.lastEvaluation = result;
      return result;
    }

    if (nowMs < current.nextAllowedAtMs) {
      const result = {
        executed: false,
        policy,
        outcome: "skipped",
        reason: "cooldown",
        nextAllowedAt: new Date(current.nextAllowedAtMs).toISOString(),
        at: new Date(nowMs).toISOString(),
      };
      state.lastEvaluation = result;
      return result;
    }

    pruneFailures(policy, nowMs);
    if (current.failureTimestamps.length >= state.maxAttempts) {
      state.paused = true;
      state.pausedReason = `${policy}: limite de tentativas excedido`;
      const result = {
        executed: false,
        policy,
        outcome: "skipped",
        reason: "circuit-open",
        at: new Date(nowMs).toISOString(),
      };
      state.lastEvaluation = result;
      return result;
    }

    let isFailing = true;
    if (healthChecks) {
      if (policy === "model-offline") {
        isFailing = healthChecks.model?.status !== HEALTH_STATUS.HEALTHY;
      }
      if (policy === "db-lock") {
        isFailing = healthChecks.db?.status !== HEALTH_STATUS.HEALTHY;
      }
    }

    if (!isFailing) {
      const result = {
        executed: false,
        policy,
        outcome: "skipped",
        reason: "no-failure-detected",
        at: new Date(nowMs).toISOString(),
      };
      state.lastEvaluation = result;
      return result;
    }

    current.lastAttemptAt = new Date(nowMs).toISOString();
    current.nextAllowedAtMs = nowMs + state.cooldownMs;
    current.trigger = trigger;

    try {
      const details = await runPolicyAction(policy);
      current.lastOutcome = "success";
      current.lastError = null;
      current.details = details;
      const result = {
        executed: true,
        policy,
        outcome: "success",
        details,
        at: current.lastAttemptAt,
      };
      state.lastEvaluation = result;
      return result;
    } catch (error) {
      current.failureTimestamps.push(nowMs);
      pruneFailures(policy, nowMs);
      current.lastOutcome = "failed";
      current.lastError = String(error?.message || error);
      current.details = null;

      if (current.failureTimestamps.length >= state.maxAttempts) {
        state.paused = true;
        state.pausedReason = `${policy}: limite de tentativas excedido`;
      }

      const result = {
        executed: true,
        policy,
        outcome: "failed",
        error: current.lastError,
        paused: state.paused,
        at: current.lastAttemptAt,
      };
      state.lastEvaluation = result;
      return result;
    }
  }

  async function evaluate({ healthChecks = null } = {}) {
    if (!state.enabled) {
      const now = new Date().toISOString();
      const result = {
        executed: false,
        policy: null,
        outcome: "skipped",
        reason: "disabled",
        at: now,
      };
      state.lastEvaluation = result;
      return result;
    }

    const checks =
      healthChecks ||
      {
        db: await healthProviders.checkDb(),
        model: await healthProviders.checkModel(),
      };

    if (checks.model?.status !== HEALTH_STATUS.HEALTHY) {
      return executePolicy("model-offline", { trigger: "auto", healthChecks: checks });
    }
    if (checks.db?.status !== HEALTH_STATUS.HEALTHY) {
      return executePolicy("db-lock", { trigger: "auto", healthChecks: checks });
    }

    const result = {
      executed: false,
      policy: null,
      outcome: "skipped",
      reason: "no-failure-detected",
      at: new Date().toISOString(),
    };
    state.lastEvaluation = result;
    return result;
  }

  return {
    getStatus,
    patchConfig,
    executePolicy,
    evaluate,
  };
}