import { createAppRuntimeConfig } from "./app-runtime-config.js";
import { createAppContextValue } from "../bootstrap/app-context-wiring.js";
import { createAppServices } from "./app-services.js";
import { createGovernanceDepsForApp } from "../bootstrap/app-governance-wiring.js";
import { createServiceDepsForApp } from "../bootstrap/app-service-wiring.js";
import { createGovernanceRuntime } from "./app-governance-runtime.js";
import { createAppGuardsAndAudit } from "./app-guards-and-audit.js";
import { createGuardsAndAuditDepsForApp } from "../bootstrap/app-guards-wiring.js";
import { createRouteDepsForApp } from "../bootstrap/app-route-wiring.js";
import { APP_ROUTE_REGISTRARS } from "./app-route-registrars.js";
import {
  isEnabled as isTelemetryEnabled,
  setEnabled as setTelemetryEnabled,
  getStats as getTelemetryStats,
  resetStats as resetTelemetryStats,
  createTelemetryMiddleware,
} from "../../../../platform/observability/telemetry/telemetry.js";
import { HttpError } from "../../../../shared/kernel/errors/HttpError.js";
import {
  CONFIG_KEYS,
  HEALTH_STATUS,
  INCIDENT_RUNBOOK_TYPES,
} from "../../../../shared/config/app-constants.js";
import * as sharedParsers from "../../../../shared/config/parsers.js";
import { DEFAULT_RETRY_DELAYS_MS, executeWithModelRecovery } from "../../../../shared/kernel/model-recovery.js";
import {
  buildOverallHealthStatus,
  buildSloSnapshot,
  buildTriageRecommendations,
} from "../../../../modules/health/application/health-builders.js";
import {
  buildCorsOriginValidator,
} from "./app-bootstrap.js";

export function createAppContext({
  deps,
  store,
  serverDir,
  chatClient,
  logger,
  asyncHandler,
  registrars,
}) {
  const routeRegistrars = registrars || APP_ROUTE_REGISTRARS;
  const healthBuilders = {
    buildOverallHealthStatus,
    buildSloSnapshot,
    buildTriageRecommendations,
  };

  const runtimeConfig = createAppRuntimeConfig({
    deps,
    serverDir,
    parseOriginList: sharedParsers.parseOriginList,
    HttpError,
    parsePositiveInt: sharedParsers.parsePositiveInt,
    DEFAULT_RETRY_DELAYS_MS,
    buildCorsOriginValidator,
  });

  const services = createAppServices(
    createServiceDepsForApp({
      core: {
        deps,
        store,
        serverDir,
        chatClient,
      },
      runtime: runtimeConfig,
      parsers: sharedParsers,
      features: {
        isTelemetryEnabled,
        setTelemetryEnabled,
        resetTelemetryStats,
        CONFIG_KEYS,
      },
    }),
  );

  const governanceRuntime = createGovernanceRuntime(
    createGovernanceDepsForApp({
      core: {
        deps,
        requestWindowMs: runtimeConfig.requestWindowMs,
        store,
        normalizeRole: sharedParsers.normalizeRole,
        getTelemetryStats,
      },
      services: {
        backupService: services.backupService,
        incidentService: services.incidentService,
        healthProviders: services.healthProviders,
      },
      builders: healthBuilders,
    }),
  );

  const guardsAndAudit = createAppGuardsAndAudit(
    createGuardsAndAuditDepsForApp({
      core: {
        store,
        logger,
        asyncHandler,
        HttpError,
      },
      services: {
        configRollbackService: services.configRollbackService,
        approvalService: services.approvalService,
      },
      parsers: {
        parseUserId: sharedParsers.parseUserId,
        normalizeRole: sharedParsers.normalizeRole,
        hasRequiredRole: sharedParsers.hasRequiredRole,
        parseOperationalApprovalId: sharedParsers.parseOperationalApprovalId,
      },
    }),
  );

  const routeDeps = createRouteDepsForApp({
    core: {
      webDir: runtimeConfig.webDir,
      logger,
      HttpError,
      asyncHandler,
      HEALTH_STATUS,
      CONFIG_KEYS,
      INCIDENT_RUNBOOK_TYPES,
      store,
      chatClient,
    },
    registrars: routeRegistrars,
    guards: {
      requireMinimumRole: guardsAndAudit.requireMinimumRole,
      requireAdminOrSelf: guardsAndAudit.requireAdminOrSelf,
      resolveActor: guardsAndAudit.resolveActor,
      recordBlockedAttempt: guardsAndAudit.recordBlockedAttempt,
      requireOperationalApproval: guardsAndAudit.requireOperationalApproval,
      readCurrentConfigValue: guardsAndAudit.readCurrentConfigValue,
      applyConfigValue: guardsAndAudit.applyConfigValue,
      recordAudit: guardsAndAudit.recordAudit,
      recordConfigVersion: guardsAndAudit.recordConfigVersion,
    },
    runtime: {
      roleLimiter: governanceRuntime.roleLimiter,
      ollamaFallbackModel: runtimeConfig.ollamaFallbackModel,
      ollamaMaxAttempts: runtimeConfig.ollamaMaxAttempts,
      ollamaTimeoutMs: runtimeConfig.ollamaTimeoutMs,
      ollamaRetryDelays: runtimeConfig.ollamaRetryDelays,
    },
    services,
    parsers: sharedParsers,
    features: {
      getTelemetryStats,
      isTelemetryEnabled,
      setTelemetryEnabled,
      resetTelemetryStats,
      collectIncidentRunbookSignals: governanceRuntime.collectIncidentRunbookSignals,
      ...healthBuilders,
      executeWithModelRecovery,
    },
  });

  return createAppContextValue({
    runtimeConfig,
    services,
    governanceRuntime,
    guardsAndAudit,
    createTelemetryMiddleware,
    routeDeps,
  });
}
