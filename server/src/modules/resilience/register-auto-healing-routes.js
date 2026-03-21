export function registerAutoHealingRoutes(app, deps) {
  const {
    asyncHandler,
    requireMinimumRole,
    assertBodyObject,
    resolveActor,
    recordAudit,
    parseAutoHealingConfigPatch,
    parseAutoHealingPolicy,
    autoHealingService,
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
}
