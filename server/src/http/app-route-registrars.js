import { registerUserRoutes } from "../modules/users/register-users-routes.js";
import { registerIncidentRoutes } from "../modules/incident/register-incident-routes.js";
import { registerApprovalRoutes } from "../modules/approvals/register-approval-routes.js";
import { registerResilienceRoutes } from "../modules/resilience/register-resilience-routes.js";
import { registerStorageRoutes } from "../modules/governance/register-storage-routes.js";
import { registerConfigRoutes } from "../modules/config-governance/register-config-routes.js";
import { registerAuditRoutes } from "../modules/governance/register-audit-routes.js";
import { registerObservabilityRoutes } from "../modules/observability/register-observability-routes.js";
import { registerChatRoutes } from "../modules/chat/register-chat-routes.js";
import { registerChatsRoutes } from "../modules/chat/register-chats-routes.js";
import { registerRagRoutes } from "../modules/chat/register-rag-routes.js";
import { registerBackupRoutes } from "../modules/backup/register-backup-routes.js";
import { registerHealthRoutes } from "../modules/health/register-health-routes.js";

export const APP_ROUTE_REGISTRARS = {
  registerHealthRoutes,
  registerChatRoutes,
  registerRagRoutes,
  registerUserRoutes,
  registerChatsRoutes,
  registerBackupRoutes,
  registerIncidentRoutes,
  registerResilienceRoutes,
  registerStorageRoutes,
  registerConfigRoutes,
  registerApprovalRoutes,
  registerAuditRoutes,
  registerObservabilityRoutes,
};
