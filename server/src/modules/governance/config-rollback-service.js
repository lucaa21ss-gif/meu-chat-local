import { HttpError } from "../../shared/errors/HttpError.js";

export function createConfigRollbackService({
  store,
  configKeys,
  parseSystemPrompt,
  parseTheme,
  parseStorageLimitMb,
  parseBooleanLike,
  isTelemetryEnabled,
  setTelemetryEnabled,
  resetTelemetryStats,
}) {
  async function readCurrentConfigValue(version) {
    switch (version.configKey) {
      case configKeys.CHAT_SYSTEM_PROMPT: {
        const promptContext = await store.getChatSystemPrompts(version.targetId);
        if (!promptContext) throw new HttpError(404, "Chat nao encontrado");
        return promptContext.systemPrompt || "";
      }
      case configKeys.USER_DEFAULT_SYSTEM_PROMPT: {
        const user = await store.getUserById(version.targetId);
        if (!user) throw new HttpError(404, "Perfil nao encontrado");
        return user.defaultSystemPrompt || "";
      }
      case configKeys.USER_THEME: {
        const user = await store.getUserById(version.targetId);
        if (!user) throw new HttpError(404, "Perfil nao encontrado");
        return user.theme || "system";
      }
      case configKeys.USER_STORAGE_LIMIT_MB: {
        const user = await store.getUserById(version.targetId);
        if (!user) throw new HttpError(404, "Perfil nao encontrado");
        return Number.parseInt(user.storageLimitMb, 10) || 512;
      }
      case configKeys.APP_TELEMETRY_ENABLED:
        return !!isTelemetryEnabled();
      default:
        throw new HttpError(400, "configKey nao suportada para rollback");
    }
  }

  async function applyConfigValue(version) {
    switch (version.configKey) {
      case configKeys.CHAT_SYSTEM_PROMPT: {
        const value = parseSystemPrompt(version.value);
        const updated = await store.setChatSystemPrompt(version.targetId, value);
        if (!updated) throw new HttpError(404, "Chat nao encontrado");
        return updated;
      }
      case configKeys.USER_DEFAULT_SYSTEM_PROMPT: {
        const value = parseSystemPrompt(version.value);
        const updated = await store.setUserDefaultSystemPrompt(version.targetId, value);
        if (!updated) throw new HttpError(404, "Perfil nao encontrado");
        return updated;
      }
      case configKeys.USER_THEME: {
        const value = parseTheme(version.value);
        const updated = await store.setUserTheme(version.targetId, value);
        if (!updated) throw new HttpError(404, "Perfil nao encontrado");
        return updated;
      }
      case configKeys.USER_STORAGE_LIMIT_MB: {
        const value = parseStorageLimitMb(version.value);
        const updated = await store.setUserStorageLimit(version.targetId, value);
        if (!updated) throw new HttpError(404, "Perfil nao encontrado");
        return updated;
      }
      case configKeys.APP_TELEMETRY_ENABLED: {
        const value = parseBooleanLike(version.value, false);
        setTelemetryEnabled(value);
        if (!value) {
          resetTelemetryStats();
        }
        return { enabled: isTelemetryEnabled() };
      }
      default:
        throw new HttpError(400, "configKey nao suportada para rollback");
    }
  }

  return {
    readCurrentConfigValue,
    applyConfigValue,
  };
}
