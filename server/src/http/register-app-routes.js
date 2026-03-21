import path from "node:path";

export function registerAppRoutes(app, deps) {
  const {
    webDir,
    HttpError,
    registerHealthRoutes,
    registerChatRoutes,
    registerRagRoutes,
    registerUserRoutes,
    registerChatsRoutes,
    registerBackupRoutes,
    registerIncidentRoutes,
    registerAutoHealingRoutes,
    registerIntegrityRoutes,
    registerDisasterRecoveryRoutes,
    registerStorageRoutes,
    registerConfigRoutes,
    registerApprovalRoutes,
    registerAuditRoutes,
    registerObservabilityRoutes,
  } = deps;

  app.get("/healthz", (req, res) => {
    req.logger?.info({ uptime: process.uptime() }, "Liveness check");
    res.status(200).json({ status: "ok", service: "chat-server" });
  });

  const moduleRegistrars = [
    [registerHealthRoutes, deps.healthRoutes],
    [registerChatRoutes, deps.chatRoutes],
    [registerRagRoutes, deps.ragRoutes],
    [registerUserRoutes, deps.userRoutes],
    [registerChatsRoutes, deps.chatsRoutes],
    [registerBackupRoutes, deps.backupRoutes],
    [registerIncidentRoutes, deps.incidentRoutes],
    [registerAutoHealingRoutes, deps.autoHealingRoutes],
    [registerIntegrityRoutes, deps.integrityRoutes],
    [registerDisasterRecoveryRoutes, deps.disasterRecoveryRoutes],
    [registerStorageRoutes, deps.storageRoutes],
    [registerConfigRoutes, deps.configRoutes],
    [registerApprovalRoutes, deps.approvalRoutes],
    [registerAuditRoutes, deps.auditRoutes],
    [registerObservabilityRoutes, deps.observabilityRoutes],
  ];

  moduleRegistrars.forEach(([register, routeDeps]) => {
    register(app, routeDeps);
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Endpoint nao encontrado" });
  });

  const staticPages = [
    ["/app", "index.html"],
    ["/produto", "produto.html"],
    ["/guia", "guia.html"],
    ["/", "index.html"],
  ];

  staticPages.forEach(([routePath, fileName]) => {
    app.get(routePath, (_req, res) => {
      res.sendFile(path.join(webDir, fileName));
    });
  });

  app.use((err, req, res, next) => {
    void next;
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof HttpError ? err.message : "Erro interno do servidor";

    req.logger?.error(
      {
        error: err.message,
        stack: err.stack,
        traceId: req.id,
      },
      `${status} ${message}`,
    );

    if (res.headersSent) {
      return;
    }

    if (req.path.startsWith("/api")) {
      res.status(status).json({ error: message, traceId: req.id || null });
      return;
    }

    res.status(status).send(message);
  });
}
