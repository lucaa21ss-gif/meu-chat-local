export function buildIncidentRoutesDeps(ctx) {
  return {
    asyncHandler: ctx.asyncHandler,
    requireMinimumRole: ctx.requireMinimumRole,
    assertBodyObject: ctx.assertBodyObject,
    resolveActor: ctx.resolveActor,
    recordAudit: ctx.recordAudit,
    requireOperationalApproval: ctx.requireOperationalApproval,
    parseIncidentUpdatePayload: ctx.parseIncidentUpdatePayload,
    parseIncidentRunbookType: ctx.parseIncidentRunbookType,
    parseIncidentRunbookMode: ctx.parseIncidentRunbookMode,
    parseIncidentOwner: ctx.parseIncidentOwner,
    parseIncidentSummary: ctx.parseIncidentSummary,
    parseIncidentNextUpdateAt: ctx.parseIncidentNextUpdateAt,
    parseBackupPassphrase: ctx.parseBackupPassphrase,
    collectIncidentRunbookSignals: ctx.collectIncidentRunbookSignals,
    incidentService: ctx.incidentService,
    INCIDENT_RUNBOOK_TYPES: ctx.INCIDENT_RUNBOOK_TYPES,
  };
}
