export function createAuthGuards({
    store,
    parseUserId,
    normalizeRole,
    hasRequiredRole,
    asyncHandler,
    HttpError,
}) {
    const PROFILE_NOT_FOUND_MESSAGE = "Perfil de acesso nao encontrado";
    const INSUFFICIENT_PERMISSION_MESSAGE = "Permissao insuficiente para esta acao";

    function resolveActorId(req) {
        const headerUserId = req.get("x-user-id");
        const bodyUserId =
            req.body && typeof req.body === "object" ? req.body.userId : undefined;
        const queryUserId = req.query?.userId;

        return parseUserId(
            headerUserId || queryUserId || bodyUserId || "user-default",
        );
    }

    async function resolveActor(req) {
        if (req.actor) return req.actor;

        const actorId = resolveActorId(req);
        const actorUser = await store.getUserById(actorId);

        if (!actorUser) {
            throw new HttpError(401, PROFILE_NOT_FOUND_MESSAGE);
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
                throw new HttpError(403, INSUFFICIENT_PERMISSION_MESSAGE);
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
            throw new HttpError(403, INSUFFICIENT_PERMISSION_MESSAGE);
        });
    }

    return {
        resolveActor,
        requireMinimumRole,
        requireAdminOrSelf,
    };
}
