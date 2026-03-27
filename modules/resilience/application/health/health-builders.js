import { HEALTH_STATUS } from "../../../../shared/config/app-constants.js";

export function buildOverallHealthStatus({ db, model, disk }) {
  const statuses = [
    db?.status || HEALTH_STATUS.HEALTHY,
    model?.status || HEALTH_STATUS.HEALTHY,
    disk?.status || HEALTH_STATUS.HEALTHY,
  ];
  if (statuses.some((s) => s === HEALTH_STATUS.UNHEALTHY)) {
    return HEALTH_STATUS.UNHEALTHY;
  }
  if (statuses.some((s) => s === HEALTH_STATUS.DEGRADED)) {
    return HEALTH_STATUS.DEGRADED;
  }
  return HEALTH_STATUS.HEALTHY;
}

export function buildHealthReport({ db, model, disk }) {
  const status = buildOverallHealthStatus({ db, model, disk });
  return {
    status,
    checkedAt: new Date().toISOString(),
    components: {
      db,
      model,
      disk,
    },
  };
}
