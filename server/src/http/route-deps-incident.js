import { createRouteDeps } from "./route-deps-factory.js";

const INCIDENT_ROUTES_PROPS = [
  "asyncHandler",
  "requireMinimumRole",
  "assertBodyObject",
  "resolveActor",
  "recordAudit",
  "requireOperationalApproval",
  "parseIncidentUpdatePayload",
  "parseIncidentRunbookType",
  "parseIncidentRunbookMode",
  "parseIncidentOwner",
  "parseIncidentSummary",
  "parseIncidentNextUpdateAt",
  "parseBackupPassphrase",
  "collectIncidentRunbookSignals",
  "incidentService",
  "INCIDENT_RUNBOOK_TYPES",
];

export function buildIncidentRoutesDeps(ctx) {
  return createRouteDeps(ctx, INCIDENT_ROUTES_PROPS);
}
