export function createQueueService({
  maxConcurrency = 4,
  maxQueueSize = 100,
  taskTimeoutMs = 30000,
  rejectPolicy = "reject",
} = {}) {
  const queue = [];
  let activeCount = 0;
  let completedCount = 0;
  let rejectedCount = 0;
  let failedCount = 0;
  const waitTimes = [];
  let lastActivityAt = new Date().toISOString();

  async function processQueue() {
    while (activeCount < maxConcurrency && queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      activeCount += 1;
      lastActivityAt = new Date().toISOString();
      const enqueuedAt = item.enqueuedAt;
      const waitTimeMs = Date.now() - enqueuedAt;
      waitTimes.push(waitTimeMs);
      if (waitTimes.length > 1000) {
        waitTimes.shift();
      }

      try {
        const timeoutPromise = new Promise((_, reject) => {
          const timeoutHandle = setTimeout(() => {
            reject(new Error(`Task timeout after ${taskTimeoutMs}ms`));
          }, taskTimeoutMs);
          item.timeoutHandle = timeoutHandle;
        });

        const result = await Promise.race([item.fn(), timeoutPromise]);
        item.resolve(result);
        completedCount += 1;
      } catch (error) {
        item.reject(error);
        failedCount += 1;
      } finally {
        clearTimeout(item.timeoutHandle);
        activeCount -= 1;
        lastActivityAt = new Date().toISOString();
        setImmediate(processQueue);
      }
    }
  }

  function enqueue(taskId, fn, priority = 0) {
    if (typeof fn !== "function") {
      return Promise.reject(new Error("fn must be a function"));
    }

    if (queue.length >= maxQueueSize) {
      rejectedCount += 1;
      lastActivityAt = new Date().toISOString();
      if (rejectPolicy === "reject") {
        return Promise.reject(
          new Error(`Queue full: ${queue.length}/${maxQueueSize} (active: ${activeCount})`),
        );
      }
    }

    return new Promise((resolve, reject) => {
      const item = {
        taskId,
        fn,
        priority,
        enqueuedAt: Date.now(),
        resolve,
        reject,
        timeoutHandle: null,
      };

      let insertedAt = queue.length;
      for (let i = 0; i < queue.length; i += 1) {
        if (queue[i].priority < priority) {
          insertedAt = i;
          break;
        }
      }
      queue.splice(insertedAt, 0, item);
      lastActivityAt = new Date().toISOString();

      if (activeCount < maxConcurrency) {
        setImmediate(processQueue);
      }
    });
  }

  function getMetrics() {
    const avgWaitTimeMs =
      waitTimes.length > 0
        ? Math.round(waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length)
        : 0;

    return {
      activeCount,
      queuedCount: queue.length,
      completedCount,
      rejectedCount,
      failedCount,
      averageWaitTimeMs: avgWaitTimeMs,
      maxConcurrency,
      maxQueueSize,
      taskTimeoutMs,
      lastActivityAt,
    };
  }

  function getHealth() {
    const metrics = getMetrics();
    const utilizationPercent = Math.round(
      ((metrics.activeCount + metrics.queuedCount) / maxConcurrency) * 100,
    );

    return {
      status:
        metrics.rejectedCount > 0 || utilizationPercent > 80
          ? "degraded"
          : "healthy",
      metrics,
      utilizationPercent,
      saturationLevel:
        utilizationPercent < 50 ? "low" : utilizationPercent < 80 ? "medium" : "high",
    };
  }

  function shutdown() {
    for (const item of queue) {
      item.reject(new Error("Queue service is shutting down"));
      clearTimeout(item.timeoutHandle);
    }
    queue.length = 0;
  }

  return {
    enqueue,
    getMetrics,
    getHealth,
    shutdown,
  };
}
