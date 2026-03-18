export function registerApprovalRoutes(app, deps) {
    const {
        asyncHandler,
        requireMinimumRole,
        assertBodyObject,
        resolveActor,
        recordAudit,
        parseOperationalApprovalStatus,
        parsePositiveInt,
        parseOperationalApprovalAction,
        parseOperationalApprovalReason,
        parseOperationalApprovalWindowMinutes,
        parseOperationalApprovalId,
        parseOperationalApprovalDecision,
        approvalService,
    } = deps;

    app.get(
        "/api/approvals",
        requireMinimumRole("operator"),
        asyncHandler(async (req, res) => {
            const status = parseOperationalApprovalStatus(req.query?.status);
            const page = parsePositiveInt(req.query?.page, 1, 1, 1000);
            const limit = parsePositiveInt(req.query?.limit, 20, 1, 200);
            const result = await approvalService.list({ status, page, limit });
            return res.json({
                approvals: result.items,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            });
        }),
    );

    app.post(
        "/api/approvals",
        requireMinimumRole("operator"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const actor = await resolveActor(req);
            const action = parseOperationalApprovalAction(req.body.action);
            const reason = parseOperationalApprovalReason(req.body.reason, {
                required: true,
            });
            const windowMinutes = parseOperationalApprovalWindowMinutes(
                req.body.windowMinutes,
                30,
            );
            const approval = await approvalService.createRequest({
                action,
                requestedBy: actor.userId,
                reason,
                windowMinutes,
            });
            await recordAudit("approval.requested", actor.userId, {
                approvalId: approval.id,
                action,
                windowMinutes,
            });
            return res.status(201).json({ approval });
        }),
    );

    app.post(
        "/api/approvals/:approvalId/decision",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const actor = await resolveActor(req);
            const approvalId = parseOperationalApprovalId(
                req.params.approvalId,
                "approvalId",
            );
            const decision = parseOperationalApprovalDecision(req.body.decision);
            const reason = parseOperationalApprovalReason(req.body.reason, {
                required: false,
            });
            const approval = await approvalService.decide({
                approvalId,
                decision,
                decidedBy: actor.userId,
                reason,
            });
            await recordAudit("approval.decision", actor.userId, {
                approvalId,
                action: approval.action,
                decision,
            });
            return res.json({ approval });
        }),
    );
}
