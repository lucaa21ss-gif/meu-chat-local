import { buildHealthRoutesDeps } from "./route-deps-health.js";
import { buildAuditRoutesDeps } from "./route-deps-audit.js";
import { buildBackupRoutesDeps } from "./route-deps-backup.js";
import { buildChatsRoutesDeps } from "./route-deps-chats.js";
import { buildChatRoutesDeps } from "./route-deps-chat.js";
import { buildIncidentRoutesDeps } from "./route-deps-incident.js";
import { buildAutoHealingRoutesDeps } from "./route-deps-auto-healing.js";
import { buildIntegrityRoutesDeps } from "./route-deps-integrity.js";
import { buildDisasterRecoveryRoutesDeps } from "./route-deps-disaster-recovery.js";
import { buildStorageRoutesDeps } from "./route-deps-storage.js";
import { buildConfigRoutesDeps } from "./route-deps-config.js";
import { buildApprovalRoutesDeps } from "./route-deps-approval.js";
import { buildObservabilityRoutesDeps } from "./route-deps-observability.js";
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
    registerAutoHealingRoutes: ctx.registerAutoHealingRoutes,
    registerIntegrityRoutes: ctx.registerIntegrityRoutes,
    registerDisasterRecoveryRoutes: ctx.registerDisasterRecoveryRoutes,
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
    autoHealingRoutes: buildAutoHealingRoutesDeps(ctx),
    integrityRoutes: buildIntegrityRoutesDeps(ctx),
    disasterRecoveryRoutes: buildDisasterRecoveryRoutesDeps(ctx),
    storageRoutes: buildStorageRoutesDeps(ctx),
    configRoutes: buildConfigRoutesDeps(ctx),
    approvalRoutes: buildApprovalRoutesDeps(ctx),
    auditRoutes: buildAuditRoutesDeps(ctx),
    observabilityRoutes: buildObservabilityRoutesDeps(ctx),
  };
}
