import { createAppRuntimeConfig } from "./app-runtime-config.js";
import { createAppServices } from "./app-services.js";
import { createGovernanceRuntime } from "./app-governance-runtime.js";
import { createAppGuardsAndAudit } from "./app-guards-and-audit.js";
import { createRouteDepsForApp } from "./app-route-wiring.js";
import { APP_ROUTE_REGISTRARS } from "./app-route-registrars.js";
import {
  isEnabled as isTelemetryEnabled,
  setEnabled as setTelemetryEnabled,
  getStats as getTelemetryStats,
  resetStats as resetTelemetryStats,
  createTelemetryMiddleware,
} from "../infra/telemetry/telemetry.js";
import { HttpError } from "../shared/errors/HttpError.js";
import {
  CONFIG_KEYS,
  HEALTH_STATUS,
  INCIDENT_RUNBOOK_TYPES,
} from "../shared/app-constants.js";
import * as sharedParsers from "../shared/parsers.js";
import { DEFAULT_RETRY_DELAYS_MS, executeWithModelRecovery } from "../shared/model-recovery.js";
import {
  buildOverallHealthStatus,
  buildSloSnapshot,
  buildTriageRecommendations,
} from "../modules/health/health-builders.js";
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

  const runtimeConfig = createAppRuntimeConfig({
    deps,
    serverDir,
    parseOriginList: sharedParsers.parseOriginList,
    HttpError,
    parsePositiveInt: sharedParsers.parsePositiveInt,
    DEFAULT_RETRY_DELAYS_MS,
    buildCorsOriginValidator,
  });

  const services = createAppServices({
    deps,
    store,
    serverDir,
    chatClient,
    ollama: {
      ollamaFallbackModel: runtimeConfig.ollamaFallbackModel,
      ollamaMaxAttempts: runtimeConfig.ollamaMaxAttempts,
      ollamaTimeoutMs: runtimeConfig.ollamaTimeoutMs,
      ollamaRetryDelays: runtimeConfig.ollamaRetryDelays,
    },
    parsers: sharedParsers,
    telemetry: {
      isTelemetryEnabled,
      setTelemetryEnabled,
      resetTelemetryStats,
      getTelemetryStats,
    },
    constants: {
      CONFIG_KEYS,
    },
  });

  const governanceRuntime = createGovernanceRuntime({
    deps,
    requestWindowMs:
      runtimeConfig.requestWindowMs ??
      Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`, 10),
    store,
    normalizeRole: sharedParsers.normalizeRole,
    getTelemetryStats,
    backupService: services.backupService,
    incidentService: services.incidentService,
    healthProviders: services.healthProviders,
    buildOverallHealthStatus,
    buildSloSnapshot,
    buildTriageRecommendations,
  });

  const guardsAndAudit = createAppGuardsAndAudit({
    store,
    logger,
    configRollbackService: services.configRollbackService,
    approvalService: services.approvalService,
    parseUserId: sharedParsers.parseUserId,
    normalizeRole: sharedParsers.normalizeRole,
    hasRequiredRole: sharedParsers.hasRequiredRole,
    asyncHandler,
    HttpError,
    parseOperationalApprovalId: sharedParsers.parseOperationalApprovalId,
  });

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
    },
    runtime: {
      getTelemetryStats,
      isTelemetryEnabled,
      setTelemetryEnabled,
      resetTelemetryStats,
      roleLimiter: governanceRuntime.roleLimiter,
      ollamaFallbackModel: runtimeConfig.ollamaFallbackModel,
      ollamaMaxAttempts: runtimeConfig.ollamaMaxAttempts,
      ollamaTimeoutMs: runtimeConfig.ollamaTimeoutMs,
      ollamaRetryDelays: runtimeConfig.ollamaRetryDelays,
    },
    services: {
      healthProviders: services.healthProviders,
      integrityService: services.integrityService,
      autoHealingService: services.autoHealingService,
      capacityService: services.capacityService,
      queueService: services.queueService,
      baselineService: services.baselineService,
      backupService: services.backupService,
      collectIncidentRunbookSignals: governanceRuntime.collectIncidentRunbookSignals,
      incidentService: services.incidentService,
      disasterRecoveryService: services.disasterRecoveryService,
      storageService: services.storageService,
      readCurrentConfigValue: guardsAndAudit.readCurrentConfigValue,
      applyConfigValue: guardsAndAudit.applyConfigValue,
      approvalService: services.approvalService,
      scorecardService: services.scorecardService,
    },
    parsers: sharedParsers,
    features: {
      assertBodyObject: sharedParsers.assertBodyObject,
      recordAudit: guardsAndAudit.recordAudit,
      recordConfigVersion: guardsAndAudit.recordConfigVersion,
      buildOverallHealthStatus,
      buildSloSnapshot,
      getChatId: sharedParsers.getChatId,
      getMessageImages: sharedParsers.getMessageImages,
      buildRagSystemMessage: sharedParsers.buildRagSystemMessage,
      buildSystemMessages: sharedParsers.buildSystemMessages,
      executeWithModelRecovery,
      clamp: sharedParsers.clamp,
      areConfigValuesEqual: sharedParsers.areConfigValuesEqual,
      buildTriageRecommendations,
    },
  });

  return {
    ...runtimeConfig,
    ...services,
    ...governanceRuntime,
    ...guardsAndAudit,
    createTelemetryMiddleware,
    routeDeps,
  };
}
