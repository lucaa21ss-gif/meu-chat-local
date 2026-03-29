import { registerUserRoutes } from "../../../../../modules/users/application/register-users-routes.js";
import { registerIncidentRoutes } from "../../../../../modules/incident/application/register-incident-routes.js";
import { registerApprovalRoutes } from "../../../../../modules/approvals/application/register-approval-routes.js";
import { registerAutoHealingRoutes } from "../../../../../modules/resilience/application/register-auto-healing-routes.js";
import { registerIntegrityRoutes } from "../../../../../modules/resilience/application/register-integrity-routes.js";
import { registerDisasterRecoveryRoutes } from "../../../../../modules/resilience/application/register-disaster-recovery-routes.js";
import { registerStorageRoutes } from "../../../../../modules/storage/application/register-storage-routes.js";
import { registerConfigRoutes } from "../../../../../modules/config-governance/application/register-config-routes.js";
import { registerAuditRoutes } from "../../../../../modules/audit/application/register-audit-routes.js";
import { registerObservabilityRoutes } from "../../../../../modules/observability/register-observability-routes.js";
import { registerChatRoutes } from "../../../../../modules/chat/application/register-chat-routes.js";
import { registerChatsRoutes } from "../../../../../modules/chat/application/register-chats-routes.js";
import { registerRagRoutes } from "../../../../../modules/chat/application/register-rag-routes.js";
import { registerBackupRoutes } from "../../../../../modules/backup/application/register-backup-routes.js";
import { registerHealthRoutes } from "../../../../../modules/health/application/register-health-routes.js";

export const APP_ROUTE_REGISTRARS = {
  registerHealthRoutes,
  registerChatRoutes,
  registerRagRoutes,
  registerUserRoutes,
  registerChatsRoutes,
  registerBackupRoutes,
  registerIncidentRoutes,
  registerAutoHealingRoutes,
  registerIntegrityRoutes,
  registerDisasterRecoveryRoutes,
  registerStorageRoutes,
  registerConfigRoutes,
  registerApprovalRoutes,
  registerAuditRoutes,
  registerObservabilityRoutes,
};
