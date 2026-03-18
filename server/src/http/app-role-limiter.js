import { createRoleLimiterQueue } from "../../rateLimiter.js";

export function createAppRoleLimiter({
  deps,
  requestWindowMs,
  store,
  normalizeRole,
}) {
  const roleLimits = deps.roleLimits ?? {
    admin: { windowMs: requestWindowMs, max: 300, chatMax: 100 },
    operator: { windowMs: requestWindowMs, max: 150, chatMax: 50 },
    viewer: { windowMs: requestWindowMs, max: 60, chatMax: 20 },
  };

  return deps.roleLimiter ??
    createRoleLimiterQueue({
      roleLimits,
      queueMax: Number.parseInt(process.env.RATE_LIMIT_QUEUE_MAX || "30", 10),
      queueTimeoutMs: Number.parseInt(
        process.env.RATE_LIMIT_QUEUE_TIMEOUT_MS || "8000",
        10,
      ),
      getRoleForUser: async (userId) => {
        try {
          const user = await store.getUserById(userId);
          return normalizeRole(user?.role, "viewer");
        } catch {
          return "viewer";
        }
      },
    });
}
