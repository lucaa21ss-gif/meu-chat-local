export function registerIntegrityRoutes(app, deps) {
  const { asyncHandler, requireMinimumRole, resolveActor, recordAudit, parseBooleanLike, integrityService } =
    deps;

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
