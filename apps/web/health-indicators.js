const STATUS_LABELS = {
  healthy: "Saudavel",
  degraded: "Degradado",
  unhealthy: "Critico",
  unknown: "Desconhecido",
};

const BADGE_CLASSES = {
  healthy:
    "inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  degraded:
    "inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  unhealthy:
    "inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
  unknown:
    "inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

const LATENCY_CLASSES = {
  good: "text-emerald-700 dark:text-emerald-300",
  warn: "text-amber-700 dark:text-amber-300",
  bad: "text-rose-700 dark:text-rose-300",
  unknown: "text-slate-500 dark:text-slate-400",
};

function getStatusLabel(status) {
  return STATUS_LABELS[status] || STATUS_LABELS.unknown;
}

export function formatLatencyLabel(latencyMs) {
  if (!Number.isFinite(latencyMs) || latencyMs < 0) return "Latencia: --";
  return `Latencia: ${Math.round(latencyMs)}ms`;
}

function getLatencyTone(latencyMs) {
  if (!Number.isFinite(latencyMs) || latencyMs < 0) return "unknown";
  if (latencyMs <= 800) return "good";
  if (latencyMs <= 1800) return "warn";
  return "bad";
}

function buildStatusTooltip(health) {
  const checks = health?.checks || {};
  const db = checks?.db?.status || "unknown";
  const model = checks?.model?.status || "unknown";
  const disk = checks?.disk?.status || "unknown";
  const alerts = Array.isArray(health?.alerts) ? health.alerts.slice(0, 2) : [];
  const lines = [
    `Status: ${getStatusLabel(health?.status)}`,
    `DB: ${db} | Modelo: ${model} | Disco: ${disk}`,
    formatLatencyLabel(health?.latencyMs),
  ];
  if (alerts.length) {
    lines.push(`Alertas: ${alerts.join(" | ")}`);
  }
  return lines.join("\n");
}

export function buildHeaderPresentation(health) {
  const status = health?.status || "unknown";
  return {
    badgeText: `Saude: ${getStatusLabel(status)}`,
    badgeClassName: BADGE_CLASSES[status] || BADGE_CLASSES.unknown,
    badgeTitle: buildStatusTooltip(health),
    latencyText: formatLatencyLabel(health?.latencyMs),
    latencyClassName: LATENCY_CLASSES[getLatencyTone(health?.latencyMs)],
  };
}

export function computePollDelayMs(failureCount, baseIntervalMs, maxIntervalMs) {
  const failures = Math.max(0, Number(failureCount) || 0);
  const base = Math.max(1, Number(baseIntervalMs) || 30000);
  const max = Math.max(base, Number(maxIntervalMs) || 300000);
  const delay = base * 2 ** failures;
  return Math.min(delay, max);
}

export function createHealthPoller(options) {
  const checkHealth = options?.checkHealth;
  const schedule = options?.schedule || setTimeout;
  const clear = options?.clear || clearTimeout;
  const baseIntervalMs = options?.baseIntervalMs || 30000;
  const maxIntervalMs = options?.maxIntervalMs || 300000;
  const onCycle = typeof options?.onCycle === "function" ? options.onCycle : null;
  let timerId = null;
  let failureCount = 0;
  let active = false;

  if (typeof checkHealth !== "function") {
    throw new Error("checkHealth precisa ser uma funcao");
  }

  async function runCycle() {
    let ok = false;
    try {
      ok = (await checkHealth()) !== false;
    } catch {
      ok = false;
    }

    failureCount = ok ? 0 : failureCount + 1;
    const delayMs = computePollDelayMs(failureCount, baseIntervalMs, maxIntervalMs);
    if (onCycle) {
      onCycle({ ok, failureCount, delayMs });
    }
    if (!active) return;
    timerId = schedule(runCycle, delayMs);
  }

  return {
    start() {
      if (active) return;
      active = true;
      void runCycle();
    },
    stop() {
      active = false;
      if (timerId != null) {
        clear(timerId);
        timerId = null;
      }
    },
    refreshNow() {
      failureCount = 0;
      if (timerId != null) {
        clear(timerId);
        timerId = null;
      }
      if (!active) active = true;
      void runCycle();
    },
    getState() {
      return {
        active,
        failureCount,
      };
    },
  };
}