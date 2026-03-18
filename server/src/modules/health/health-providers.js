import path from "node:path";
import { statfs } from "node:fs/promises";
import { HEALTH_STATUS } from "../../shared/app-constants.js";
import { withTimeout } from "../../shared/model-recovery.js";

export function createDefaultHealthProviders({ store, chatClient, dbPath }) {
  return {
    async checkDb() {
      const start = Date.now();
      try {
        await withTimeout(
          store.listChats("user-default", {
            favoriteOnly: false,
            showArchived: false,
            tag: null,
          }),
          4_000,
          "DB nao respondeu no prazo",
        );
        return {
          status: HEALTH_STATUS.HEALTHY,
          latencyMs: Date.now() - start,
        };
      } catch (error) {
        return {
          status: HEALTH_STATUS.UNHEALTHY,
          latencyMs: Date.now() - start,
          error: error.message,
        };
      }
    },

    async checkModel() {
      const start = Date.now();
      try {
        await withTimeout(chatClient.list(), 5_000, "Modelo nao respondeu no prazo");
        return {
          status: HEALTH_STATUS.HEALTHY,
          latencyMs: Date.now() - start,
          ollama: "online",
        };
      } catch (error) {
        return {
          status: HEALTH_STATUS.DEGRADED,
          latencyMs: Date.now() - start,
          ollama: "offline",
          error: error.message,
        };
      }
    },

    async checkDisk() {
      const start = Date.now();
      try {
        const stats = await statfs(path.dirname(dbPath));
        const totalBytes = Number(stats.bsize || 0) * Number(stats.blocks || 0);
        const freeBytes = Number(stats.bsize || 0) * Number(stats.bavail || 0);
        const freePercent = totalBytes > 0 ? Math.round((freeBytes / totalBytes) * 100) : 0;

        let status = HEALTH_STATUS.HEALTHY;
        if (freePercent <= 5) {
          status = HEALTH_STATUS.UNHEALTHY;
        } else if (freePercent <= 15) {
          status = HEALTH_STATUS.DEGRADED;
        }

        return {
          status,
          latencyMs: Date.now() - start,
          totalBytes,
          freeBytes,
          freePercent,
        };
      } catch (error) {
        return {
          status: HEALTH_STATUS.DEGRADED,
          latencyMs: Date.now() - start,
          error: error.message,
        };
      }
    },
  };
}
