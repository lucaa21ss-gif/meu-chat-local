export function registerDisasterRecoveryRoutes(app, deps) {
  const {
    asyncHandler,
    requireMinimumRole,
    assertBodyObject,
    resolveActor,
    recordAudit,
    requireOperationalApproval,
    parseDisasterScenarioId,
    parseBackupPassphrase,
    disasterRecoveryService,
  } = deps;

  app.post(
    "/api/disaster-recovery/test",
    requireMinimumRole("admin"),
    asyncHandler(async (req, res) => {
      assertBodyObject(req.body);
      const actor = await resolveActor(req);
      await requireOperationalApproval(req, {
        action: "disaster-recovery.test",
        actorUserId: actor.userId,
      });
      const scenarioId = parseDisasterScenarioId(req.body.scenarioId);
      const passphrase = parseBackupPassphrase(req.body.passphrase);
      const result = await disasterRecoveryService.runScenario({
        actorUserId: actor.userId,
        scenarioId,
        passphrase,
      });

      await recordAudit("disaster.recovery.test", actor.userId, {
        scenarioId: result.report?.scenarioId,
        status: result.report?.status,
        rtoMs: result.report?.indicators?.rtoMs,
      });

      return res.json({
        ok: result.ok,
        reportPath: result.reportPath,
        report: result.report,
      });
    }),
  );
}
