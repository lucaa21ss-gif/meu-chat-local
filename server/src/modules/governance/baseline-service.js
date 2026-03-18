import path from "node:path";
import { mkdir as fsMkdir, readFile as fsReadFile, writeFile as fsWriteFile } from "node:fs/promises";

export function buildBaselineConfigSnapshot({
  isTelemetryEnabled,
  parsePositiveInt,
  queueConfig,
  autoHealingService,
}) {
  const autoHealingStatus = autoHealingService.getStatus();
  return {
    telemetryEnabled: isTelemetryEnabled(),
    queue: {
      maxConcurrency: parsePositiveInt(queueConfig.maxConcurrency, 4, 1, 32),
      maxSize: parsePositiveInt(queueConfig.maxSize, 100, 1, 500),
      taskTimeoutMs: parsePositiveInt(queueConfig.taskTimeoutMs, 30000, 5000, 120000),
      rejectPolicy: (queueConfig.rejectPolicy || "reject").trim(),
    },
    autoHealing: {
      enabled: autoHealingStatus.enabled,
      cooldownMs: autoHealingStatus.cooldownMs,
      maxAttempts: autoHealingStatus.maxAttempts,
    },
  };
}

export function createDefaultBaselineService({ baselinePath, getConfig }) {
  async function load() {
    try {
      const raw = await fsReadFile(baselinePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function save() {
    const config = getConfig();
    const record = { config, savedAt: new Date().toISOString() };
    await fsMkdir(path.dirname(baselinePath), { recursive: true });
    await fsWriteFile(baselinePath, JSON.stringify(record, null, 2), "utf-8");
    return record;
  }

  async function check() {
    const checkedAt = new Date().toISOString();
    const saved = await load();
    const current = getConfig();

    if (!saved) {
      return {
        hasSaved: false,
        status: "not-configured",
        baseline: null,
        current,
        driftedKeys: [],
        checkedAt,
      };
    }

    const baseline = saved.config;
    const driftedKeys = [];

    function deepEqual(a, b) {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    for (const key of Object.keys(baseline)) {
      if (!deepEqual(baseline[key], current[key])) {
        driftedKeys.push(key);
      }
    }
    for (const key of Object.keys(current)) {
      if (!(key in baseline) && !driftedKeys.includes(key)) {
        driftedKeys.push(key);
      }
    }

    return {
      hasSaved: true,
      status: driftedKeys.length > 0 ? "drift" : "ok",
      baseline,
      current,
      driftedKeys,
      savedAt: saved.savedAt,
      checkedAt,
    };
  }

  return { load, save, check };
}
