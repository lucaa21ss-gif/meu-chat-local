export function registerIncidentRoutes(app, deps) {
    const {
        asyncHandler,
        requireMinimumRole,
        assertBodyObject,
        resolveActor,
        recordAudit,
        requireOperationalApproval,
        parseIncidentUpdatePayload,
        parseIncidentRunbookType,
        parseIncidentRunbookMode,
        parseIncidentOwner,
        parseIncidentSummary,
        parseIncidentNextUpdateAt,
        parseBackupPassphrase,
        collectIncidentRunbookSignals,
        incidentService,
        INCIDENT_RUNBOOK_TYPES,
    } = deps;

    app.get(
        "/api/incident/status",
        requireMinimumRole("operator"),
        asyncHandler(async (_req, res) => {
            return res.json({ incident: incidentService.getStatus() });
        }),
    );

    app.patch(
        "/api/incident/status",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const actor = await resolveActor(req);
            const patch = parseIncidentUpdatePayload(req.body);
            const incident = incidentService.updateStatus(patch, actor.userId);

            await recordAudit("incident.status.update", actor.userId, {
                status: incident.status,
                severity: incident.severity,
            });

            return res.json({ incident });
        }),
    );

    app.post(
        "/api/incident/runbook/execute",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const actor = await resolveActor(req);

            const runbookType = parseIncidentRunbookType(req.body.runbookType);
            const mode = parseIncidentRunbookMode(req.body.mode);
            if (mode !== "dry-run") {
                await requireOperationalApproval(req, {
                    action: "incident.runbook.execute",
                    actorUserId: actor.userId,
                });
            }
            const owner = parseIncidentOwner(req.body.owner) || actor.userId;
            const customSummary = parseIncidentSummary(req.body.summary);
            const customNextUpdateAt = parseIncidentNextUpdateAt(req.body.nextUpdateAt);
            const backupPassphrase = parseBackupPassphrase(req.body.backupPassphrase);

            const runbookPlan = INCIDENT_RUNBOOK_TYPES[runbookType];
            const runbookId = `runbook-${Date.now()}`;
            const startedAt = new Date().toISOString();
            const steps = [];
            const incidentBefore = incidentService.getStatus();
            let incidentAfter = incidentBefore;

            if (mode === "dry-run") {
                steps.push({
                    step: "plan",
                    status: "simulated",
                    detail: "Execucao simulada sem alterar estado operacional",
                    at: new Date().toISOString(),
                });
            }

            if (mode === "execute") {
                const nextUpdateAt =
                    customNextUpdateAt || new Date(Date.now() + 15 * 60 * 1000).toISOString();

                incidentAfter = incidentService.updateStatus(
                    {
                        status: "investigating",
                        severity: runbookPlan.severity,
                        summary: customSummary || runbookPlan.triageSummary,
                        owner,
                        recommendationType: runbookPlan.recommendationType,
                        nextUpdateAt,
                    },
                    actor.userId,
                );
                steps.push({
                    step: "triage",
                    status: "completed",
                    detail: "Incidente movido para investigating",
                    at: new Date().toISOString(),
                });

                incidentAfter = incidentService.updateStatus(
                    {
                        status: "mitigating",
                        severity: runbookPlan.severity,
                        summary: runbookPlan.mitigationSummary,
                        owner,
                        recommendationType: runbookPlan.recommendationType,
                        nextUpdateAt,
                    },
                    actor.userId,
                );
                steps.push({
                    step: "mitigation",
                    status: "completed",
                    detail: "Incidente movido para mitigating",
                    at: new Date().toISOString(),
                });
            }

            if (mode === "rollback") {
                if (incidentAfter.status !== "normal") {
                    incidentAfter = incidentService.updateStatus(
                        {
                            status: "monitoring",
                            severity: "low",
                            summary: "Rollback operacional em progresso",
                            owner,
                            recommendationType: "manual",
                            nextUpdateAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                        },
                        actor.userId,
                    );
                    steps.push({
                        step: "rollback-monitoring",
                        status: "completed",
                        detail: "Incidente movido para monitoring antes do retorno ao normal",
                        at: new Date().toISOString(),
                    });

                    incidentAfter = incidentService.updateStatus(
                        {
                            status: "normal",
                            severity: "info",
                            summary: customSummary || `Rollback concluido para ${runbookType}`,
                            owner: null,
                            recommendationType: null,
                            nextUpdateAt: null,
                        },
                        actor.userId,
                    );
                }

                steps.push({
                    step: "rollback-finalize",
                    status: "completed",
                    detail: "Estado operacional normalizado",
                    at: new Date().toISOString(),
                });
            }

            const signals = await collectIncidentRunbookSignals({ backupPassphrase });
            const finishedAt = new Date().toISOString();

            await recordAudit("incident.runbook.execute", actor.userId, {
                runbookId,
                runbookType,
                mode,
                healthStatus: signals.health.status,
                sloStatus: signals.slo.status,
                backupStatus: signals.backupValidation.status,
                finalIncidentStatus: incidentAfter.status,
            });

            return res.json({
                ok: true,
                runbook: {
                    id: runbookId,
                    type: runbookType,
                    mode,
                    actorUserId: actor.userId,
                    startedAt,
                    finishedAt,
                    incidentBefore,
                    incidentAfter,
                    steps,
                    evidence: {
                        health: signals.health,
                        slo: signals.slo,
                        backupValidation: signals.backupValidation,
                        recentErrors: signals.recentErrors,
                        recommendations: signals.recommendations,
                    },
                },
            });
        }),
    );
}
