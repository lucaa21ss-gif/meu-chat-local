export function createAuditHelpers({ store, logger }) {
  async function recordAudit(eventType, userId = null, meta = {}) {
    try {
      await store.appendAuditLog(userId, eventType, meta);
    } catch (error) {
      logger.warn(
        {
          eventType,
          userId,
          error: error.message,
        },
        "Falha ao registrar evento de auditoria",
      );
    }
  }

  async function recordConfigVersion(payload = {}) {
    try {
      await store.appendConfigVersion(payload);
    } catch (error) {
      logger.warn(
        {
          configKey: payload.configKey,
          targetType: payload.targetType,
          targetId: payload.targetId,
          error: error.message,
        },
        "Falha ao registrar versao de configuracao",
      );
    }
  }

  return {
    recordAudit,
    recordConfigVersion,
  };
}