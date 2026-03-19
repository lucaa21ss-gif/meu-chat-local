import path from "node:path";
import { resolveDbPath } from "./app-store.js";

export function createAppServicePaths({ deps, serverDir }) {
  const dbPath = resolveDbPath(deps);
  const repoRoot = path.resolve(serverDir, "..");
  const artifactsDir = path.join(serverDir, "artifacts");

  return {
    dbPath,
    repoRoot,
    artifactsDir,
  };
}

export function createQueueServiceConfig({
  parsePositiveInt,
  env = process.env,
}) {
  return {
    maxConcurrency: parsePositiveInt(
      env.QUEUE_MAX_CONCURRENCY,
      4,
      1,
      32,
    ),
    maxQueueSize: parsePositiveInt(
      env.QUEUE_MAX_SIZE,
      100,
      1,
      500,
    ),
    taskTimeoutMs: parsePositiveInt(
      env.QUEUE_TASK_TIMEOUT_MS,
      30000,
      5000,
      120000,
    ),
    rejectPolicy: (env.QUEUE_REJECT_POLICY || "reject").trim(),
  };
}

export function createBaselineQueueConfig(env = process.env) {
  return {
    maxConcurrency: env.QUEUE_MAX_CONCURRENCY,
    maxSize: env.QUEUE_MAX_SIZE,
    taskTimeoutMs: env.QUEUE_TASK_TIMEOUT_MS,
    rejectPolicy: env.QUEUE_REJECT_POLICY || "reject",
  };
}

export function createIntegrityServiceConfig(repoRoot) {
  return {
    baseDir: repoRoot,
    manifestPath: path.resolve(repoRoot, ".integrity-manifest.sha256"),
    targets: [
      "docker-compose.yml",
      "server/package.json",
      "server/package-lock.json",
      "web/package.json",
      "web/package-lock.json",
      "scripts/install.sh",
      "scripts/start.sh",
      "scripts/stop.sh",
      "scripts/uninstall.sh",
    ],
    staleAfterMs: 30_000,
  };
}