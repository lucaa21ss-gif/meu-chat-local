import { createRouteDeps } from "./route-deps-factory.js";

const APPROVAL_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "assertBodyObject",
  "resolveActor",
  "recordAudit",
  "parseOperationalApprovalStatus",
  "parsePositiveInt",
  "parseOperationalApprovalAction",
  "parseOperationalApprovalReason",
  "parseOperationalApprovalWindowMinutes",
  "parseOperationalApprovalId",
  "parseOperationalApprovalDecision",
  "approvalService",
];

export function buildApprovalRoutesDeps(ctx) {
  return createRouteDeps(ctx, APPROVAL_ROUTES_PROPS);
}
