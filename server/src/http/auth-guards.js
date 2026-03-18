export function createAuthGuards({
    store,
    parseUserId,
    normalizeRole,
    hasRequiredRole,
    asyncHandler,
    HttpError,
}) {
    async function resolveActor(req) {
        if (req.actor) return req.actor;

        const headerUserId = req.get("x-user-id");
        const bodyUserId =
            req.body && typeof req.body === "object" ? req.body.userId : undefined;
        const queryUserId = req.query?.userId;
        const actorId = parseUserId(
            headerUserId || queryUserId || bodyUserId || "user-default",
        );
        const actorUser = await store.getUserById(actorId);

        if (!actorUser) {
            throw new HttpError(401, "Perfil de acesso nao encontrado");
        }

        req.actor = {
            userId: actorId,
            role: normalizeRole(actorUser.role, "viewer"),
        };

        return req.actor;
    }

    function requireMinimumRole(minimumRole) {
        return asyncHandler(async (req, _res, next) => {
            const actor = await resolveActor(req);
            if (!hasRequiredRole(actor.role, minimumRole)) {
                throw new HttpError(403, "Permissao insuficiente para esta acao");
            }
            next();
        });
    }

    function requireAdminOrSelf(userIdParam = "userId") {
        return asyncHandler(async (req, _res, next) => {
            const actor = await resolveActor(req);
            const targetUserId = parseUserId(req.params[userIdParam]);
            if (actor.userId === targetUserId || actor.role === "admin") {
                next();
                return;
            }
            throw new HttpError(403, "Permissao insuficiente para esta acao");
        });
    }

    return {
        resolveActor,
        requireMinimumRole,
        requireAdminOrSelf,
    };
}
