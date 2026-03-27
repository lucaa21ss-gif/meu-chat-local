import { createAuditHelpers } from "./audit-helpers.js";
import { createAuthGuards } from "./auth-guards.js";
import { createOperationalGuards } from "./operational-guards.js";

export function createAppGuardsAndAudit({
  store,
  logger,
  configRollbackService,
  approvalService,
  parseUserId,
  normalizeRole,
  hasRequiredRole,
  asyncHandler,
  HttpError,
  parseOperationalApprovalId,
}) {
  const auditHelpers = createAuditHelpers({
    store,
    logger,
  });

  const { readCurrentConfigValue, applyConfigValue } = configRollbackService;

  const authGuards = createAuthGuards({
    store,
    parseUserId,
    normalizeRole,
    hasRequiredRole,
    asyncHandler,
    HttpError,
  });

  const operationalGuards = createOperationalGuards({
    resolveActor: authGuards.resolveActor,
    recordAudit: auditHelpers.recordAudit,
    approvalService,
    parseOperationalApprovalId,
    HttpError,
  });

  return {
    ...auditHelpers,
    readCurrentConfigValue,
    applyConfigValue,
    ...authGuards,
    ...operationalGuards,
  };
}
