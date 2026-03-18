export function createOperationalGuards({
    resolveActor,
    recordAudit,
    approvalService,
    parseOperationalApprovalId,
    HttpError,
}) {
    async function recordBlockedAttempt(req, eventType, error, meta = {}) {
        if (!(error instanceof HttpError)) return;

        const actor = await resolveActor(req).catch(() => null);
        await recordAudit(eventType, actor?.userId || null, {
            reason: error.message,
            ...meta,
        });
    }

    async function requireOperationalApproval(req, { action, actorUserId }) {
        const approvalId = parseOperationalApprovalId(
            req.body?.approvalId || req.get("x-approval-id"),
            "approvalId",
        );
        try {
            const approval = await approvalService.consume({
                approvalId,
                action,
                actorUserId,
            });
            await recordAudit("approval.consumed", actorUserId, {
                approvalId: approval.id,
                action,
                requestedBy: approval.requestedBy,
                approvedBy: approval.approvedBy,
                windowStartAt: approval.windowStartAt,
                windowEndAt: approval.windowEndAt,
            });
            return approval;
        } catch (error) {
            await recordAudit("approval.blocked", actorUserId || null, {
                action,
                approvalId,
                reason: error?.message || "Aprovacao invalida",
            });
            throw error;
        }
    }

    return {
        recordBlockedAttempt,
        requireOperationalApproval,
    };
}
