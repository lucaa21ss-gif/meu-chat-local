export function registerResilienceRoutes(app, deps) {
  const {
    asyncHandler,
    requireMinimumRole,
    assertBodyObject,
    resolveActor,
    recordAudit,
    requireOperationalApproval,
    parseAutoHealingConfigPatch,
    parseAutoHealingPolicy,
    parseDisasterScenarioId,
    parseBackupPassphrase,
    parseBooleanLike,
    autoHealingService,
    disasterRecoveryService,
    integrityService,
  } = deps;

  app.get(
    "/api/auto-healing/status",
    requireMinimumRole("operator"),
    asyncHandler(async (_req, res) => {
      return res.json({ autoHealing: autoHealingService.getStatus() });
    }),
  );

  app.patch(
    "/api/auto-healing/status",
    requireMinimumRole("admin"),
    asyncHandler(async (req, res) => {
      assertBodyObject(req.body);
      const actor = await resolveActor(req);
      const patch = parseAutoHealingConfigPatch(req.body);
      const updated = autoHealingService.patchConfig(patch);

      await recordAudit("autohealing.config.update", actor.userId, {
        enabled: updated.enabled,
        cooldownMs: updated.cooldownMs,
        maxAttempts: updated.maxAttempts,
        windowMs: updated.windowMs,
        resetCircuit: !!patch.resetCircuit,
      });

      return res.json({ autoHealing: updated });
    }),
  );

  app.post(
    "/api/auto-healing/execute",
    requireMinimumRole("admin"),
    asyncHandler(async (req, res) => {
      assertBodyObject(req.body);
      const actor = await resolveActor(req);
      const policy = parseAutoHealingPolicy(req.body.policy);
      const execution = await autoHealingService.executePolicy(policy, {
        trigger: "manual",
      });

      await recordAudit("autohealing.execute", actor.userId, {
        policy,
        outcome: execution.outcome,
        reason: execution.reason || null,
      });

      return res.json({
        ok: execution.outcome !== "failed",
        execution,
        autoHealing: autoHealingService.getStatus(),
      });
    }),
  );

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

  app.get(
    "/api/integrity/status",
    requireMinimumRole("operator"),
    asyncHandler(async (req, res) => {
      const refresh = parseBooleanLike(req.query?.refresh, false);
      const integrity = await integrityService.getOrRefresh({ force: refresh });
      return res.json({ integrity });
    }),
  );

  app.post(
    "/api/integrity/verify",
    requireMinimumRole("admin"),
    asyncHandler(async (req, res) => {
      const actor = await resolveActor(req);
      const integrity = await integrityService.getOrRefresh({ force: true });
      await recordAudit("integrity.verify", actor.userId, {
        status: integrity.status,
        mismatches: integrity.mismatches.length,
        missingFiles: integrity.missingFiles.length,
      });
      return res.json({
        ok: integrity.status === "ok",
        integrity,
      });
    }),
  );
}
