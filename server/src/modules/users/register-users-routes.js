export function registerUserRoutes(app, deps) {
    const {
        asyncHandler,
        requireMinimumRole,
        requireAdminOrSelf,
        assertBodyObject,
        parseUserId,
        parseUserName,
        parseUserRole,
        parseChatId,
        parseSystemPrompt,
        parseTheme,
        parseUiPreferences,
        parseStorageLimitMb,
        resolveActor,
        recordAudit,
        recordConfigVersion,
        CONFIG_KEYS,
        HttpError,
        store,
    } = deps;

    app.get(
        "/api/users",
        asyncHandler(async (_req, res) => {
            const users = await store.listUsers();
            res.json({ users });
        }),
    );

    app.post(
        "/api/users",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const name = parseUserName(req.body.name);
            const role = parseUserRole(req.body.role, "operator");
            const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const user = await store.createUser(id, name, role);
            res.status(201).json({ user });
        }),
    );

    app.patch(
        "/api/users/:userId",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const userId = parseChatId(req.params.userId, "userId");
            const name = parseUserName(req.body.name);
            const updated = await store.renameUser(userId, name);
            if (!updated) {
                throw new HttpError(404, "Perfil nao encontrado");
            }
            return res.json({ user: updated });
        }),
    );

    app.patch(
        "/api/users/:userId/system-prompt-default",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const actor = await resolveActor(req);
            const userId = parseChatId(req.params.userId, "userId");
            const defaultSystemPrompt = parseSystemPrompt(
                req.body.defaultSystemPrompt,
            );
            const updated = await store.setUserDefaultSystemPrompt(
                userId,
                defaultSystemPrompt,
            );
            if (!updated) throw new HttpError(404, "Perfil nao encontrado");
            await recordConfigVersion({
                configKey: CONFIG_KEYS.USER_DEFAULT_SYSTEM_PROMPT,
                targetType: "user",
                targetId: userId,
                value: defaultSystemPrompt,
                actorUserId: actor.userId,
                source: "api",
                meta: {
                    origin: "user.system-prompt-default.patch",
                },
            });
            return res.json({ user: updated });
        }),
    );

    app.patch(
        "/api/users/:userId/theme",
        requireAdminOrSelf("userId"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const actor = await resolveActor(req);
            const userId = parseChatId(req.params.userId, "userId");
            const theme = parseTheme(req.body.theme);
            const updated = await store.setUserTheme(userId, theme);
            if (!updated) throw new HttpError(404, "Perfil nao encontrado");
            await recordConfigVersion({
                configKey: CONFIG_KEYS.USER_THEME,
                targetType: "user",
                targetId: userId,
                value: theme,
                actorUserId: actor.userId,
                source: "api",
                meta: {
                    origin: "user.theme.patch",
                },
            });
            return res.json({ user: updated });
        }),
    );

    app.get(
        "/api/users/:userId/ui-preferences",
        requireAdminOrSelf("userId"),
        asyncHandler(async (req, res) => {
            const userId = parseChatId(req.params.userId, "userId");
            const prefs = await store.getUiPreferences(userId);
            if (!prefs) throw new HttpError(404, "Perfil nao encontrado");
            return res.json({ userId, preferences: prefs });
        }),
    );

    app.patch(
        "/api/users/:userId/ui-preferences",
        requireAdminOrSelf("userId"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const actor = await resolveActor(req);
            const userId = parseChatId(req.params.userId, "userId");
            const prefs = parseUiPreferences(req.body);
            const updated = await store.setUiPreferences(userId, prefs);
            if (!updated) throw new HttpError(404, "Perfil nao encontrado");
            if (prefs.theme !== undefined) {
                await recordConfigVersion({
                    configKey: CONFIG_KEYS.USER_THEME,
                    targetType: "user",
                    targetId: userId,
                    value: prefs.theme,
                    actorUserId: actor.userId,
                    source: "api",
                    meta: { origin: "user.ui-preferences.patch" },
                });
            }
            await recordAudit("user.ui-preferences.updated", userId, {
                prefs,
                actorUserId: actor.userId,
            });
            return res.json({ userId, preferences: updated });
        }),
    );

    app.patch(
        "/api/users/:userId/storage-limit",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const actor = await resolveActor(req);
            const userId = parseChatId(req.params.userId, "userId");
            const storageLimitMb = parseStorageLimitMb(req.body.storageLimitMb);
            const updated = await store.setUserStorageLimit(userId, storageLimitMb);
            if (!updated) throw new HttpError(404, "Perfil nao encontrado");
            await recordConfigVersion({
                configKey: CONFIG_KEYS.USER_STORAGE_LIMIT_MB,
                targetType: "user",
                targetId: userId,
                value: storageLimitMb,
                actorUserId: actor.userId,
                source: "api",
                meta: {
                    origin: "user.storage-limit.patch",
                },
            });
            return res.json({ user: updated });
        }),
    );

    app.patch(
        "/api/users/:userId/role",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const userId = parseChatId(req.params.userId, "userId");
            const role = parseUserRole(req.body.role);
            const updated = await store.setUserRole(userId, role);
            if (!updated) throw new HttpError(404, "Perfil nao encontrado");
            return res.json({ user: updated });
        }),
    );

    app.post(
        "/api/audit/profile-switch",
        asyncHandler(async (req, res) => {
            assertBodyObject(req.body);
            const userId = parseUserId(req.body.userId);
            await recordAudit("profile.switch", userId, {
                source: "frontend",
            });
            return res.status(201).json({ ok: true });
        }),
    );

    app.delete(
        "/api/users/:userId",
        requireMinimumRole("admin"),
        asyncHandler(async (req, res) => {
            const userId = parseChatId(req.params.userId, "userId");
            if (userId === "user-default") {
                throw new HttpError(403, "Perfil padrao nao pode ser excluido");
            }
            const deleted = await store.deleteUser(userId);
            if (!deleted) {
                throw new HttpError(404, "Perfil nao encontrado");
            }
            await recordAudit("user.delete", userId, {
                actor: "api",
            });
            return res.json({ ok: true });
        }),
    );
}
