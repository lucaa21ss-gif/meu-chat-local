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
  const { recordAudit, recordConfigVersion } = createAuditHelpers({
    store,
    logger,
  });

  const { readCurrentConfigValue, applyConfigValue } = configRollbackService;

  const { resolveActor, requireMinimumRole, requireAdminOrSelf } =
    createAuthGuards({
      store,
      parseUserId,
      normalizeRole,
      hasRequiredRole,
      asyncHandler,
      HttpError,
    });

  const { recordBlockedAttempt, requireOperationalApproval } =
    createOperationalGuards({
      resolveActor,
      recordAudit,
      approvalService,
      parseOperationalApprovalId,
      HttpError,
    });

  return {
    recordAudit,
    recordConfigVersion,
    readCurrentConfigValue,
    applyConfigValue,
    resolveActor,
    requireMinimumRole,
    requireAdminOrSelf,
    recordBlockedAttempt,
    requireOperationalApproval,
  };
}
