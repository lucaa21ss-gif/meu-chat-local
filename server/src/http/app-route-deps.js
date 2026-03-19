import { buildHealthRoutesDeps } from "./route-deps-health.js";
import { buildAuditRoutesDeps } from "./route-deps-audit.js";
import { buildBackupRoutesDeps } from "./route-deps-backup.js";
import { buildChatsRoutesDeps } from "./route-deps-chats.js";
import { buildChatRoutesDeps } from "./route-deps-chat.js";
import { buildIncidentRoutesDeps } from "./route-deps-incident.js";
import { buildResilienceRoutesDeps } from "./route-deps-resilience.js";
import { buildStorageRoutesDeps } from "./route-deps-storage.js";
import { buildConfigRoutesDeps } from "./route-deps-config.js";
import { buildRagRoutesDeps } from "./route-deps-rag.js";
import { buildUserRoutesDeps } from "./route-deps-user.js";

export function buildRegisterAppRoutesDeps(ctx) {
  return {
    webDir: ctx.webDir,
    logger: ctx.logger,
    HttpError: ctx.HttpError,
    registerHealthRoutes: ctx.registerHealthRoutes,
    registerChatRoutes: ctx.registerChatRoutes,
    registerRagRoutes: ctx.registerRagRoutes,
    registerUserRoutes: ctx.registerUserRoutes,
    registerChatsRoutes: ctx.registerChatsRoutes,
    registerBackupRoutes: ctx.registerBackupRoutes,
    registerIncidentRoutes: ctx.registerIncidentRoutes,
    registerResilienceRoutes: ctx.registerResilienceRoutes,
    registerStorageRoutes: ctx.registerStorageRoutes,
    registerConfigRoutes: ctx.registerConfigRoutes,
    registerApprovalRoutes: ctx.registerApprovalRoutes,
    registerAuditRoutes: ctx.registerAuditRoutes,
    registerObservabilityRoutes: ctx.registerObservabilityRoutes,
    healthRoutes: buildHealthRoutesDeps(ctx),
    chatRoutes: buildChatRoutesDeps(ctx),
    ragRoutes: buildRagRoutesDeps(ctx),
    userRoutes: buildUserRoutesDeps(ctx),
    chatsRoutes: buildChatsRoutesDeps(ctx),
    backupRoutes: buildBackupRoutesDeps(ctx),
    incidentRoutes: buildIncidentRoutesDeps(ctx),
    resilienceRoutes: buildResilienceRoutesDeps(ctx),
    storageRoutes: buildStorageRoutesDeps(ctx),
    configRoutes: buildConfigRoutesDeps(ctx),
    approvalRoutes: {
      asyncHandler: ctx.asyncHandler,
      requireMinimumRole: ctx.requireMinimumRole,
      assertBodyObject: ctx.assertBodyObject,
      resolveActor: ctx.resolveActor,
      recordAudit: ctx.recordAudit,
      parseOperationalApprovalStatus: ctx.parseOperationalApprovalStatus,
      parsePositiveInt: ctx.parsePositiveInt,
      parseOperationalApprovalAction: ctx.parseOperationalApprovalAction,
      parseOperationalApprovalReason: ctx.parseOperationalApprovalReason,
      parseOperationalApprovalWindowMinutes: ctx.parseOperationalApprovalWindowMinutes,
      parseOperationalApprovalId: ctx.parseOperationalApprovalId,
      parseOperationalApprovalDecision: ctx.parseOperationalApprovalDecision,
      approvalService: ctx.approvalService,
    },
    auditRoutes: buildAuditRoutesDeps(ctx),
    observabilityRoutes: {
      asyncHandler: ctx.asyncHandler,
      requireMinimumRole: ctx.requireMinimumRole,
      recordAudit: ctx.recordAudit,
      buildOverallHealthStatus: ctx.buildOverallHealthStatus,
      buildSloSnapshot: ctx.buildSloSnapshot,
      buildTriageRecommendations: ctx.buildTriageRecommendations,
      getTelemetryStats: ctx.getTelemetryStats,
      isTelemetryEnabled: ctx.isTelemetryEnabled,
      healthProviders: ctx.healthProviders,
      backupService: ctx.backupService,
      integrityService: ctx.integrityService,
      capacityService: ctx.capacityService,
      baselineService: ctx.baselineService,
      autoHealingService: ctx.autoHealingService,
      incidentService: ctx.incidentService,
      queueService: ctx.queueService,
      scorecardService: ctx.scorecardService,
      approvalService: ctx.approvalService,
      storageService: ctx.storageService,
      roleLimiter: ctx.roleLimiter,
      store: ctx.store,
    },
  };
}
