export function buildChatRoutesDeps(ctx) {
  return {
    asyncHandler: ctx.asyncHandler,
    assertBodyObject: ctx.assertBodyObject,
    parseMessage: ctx.parseMessage,
    getChatId: ctx.getChatId,
    parseOptions: ctx.parseOptions,
    parseRagOptions: ctx.parseRagOptions,
    getMessageImages: ctx.getMessageImages,
    recordBlockedAttempt: ctx.recordBlockedAttempt,
    buildRagSystemMessage: ctx.buildRagSystemMessage,
    buildSystemMessages: ctx.buildSystemMessages,
    executeWithModelRecovery: ctx.executeWithModelRecovery,
    ollamaFallbackModel: ctx.ollamaFallbackModel,
    ollamaMaxAttempts: ctx.ollamaMaxAttempts,
    ollamaTimeoutMs: ctx.ollamaTimeoutMs,
    ollamaRetryDelays: ctx.ollamaRetryDelays,
    chatClient: ctx.chatClient,
    queueService: ctx.queueService,
    store: ctx.store,
    HttpError: ctx.HttpError,
  };
}