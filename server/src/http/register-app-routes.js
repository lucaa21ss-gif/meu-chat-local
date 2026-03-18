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
    registerResilienceRoutes,
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

  registerHealthRoutes(app, deps.healthRoutes);
  registerChatRoutes(app, deps.chatRoutes);
  registerRagRoutes(app, deps.ragRoutes);
  registerUserRoutes(app, deps.userRoutes);
  registerChatsRoutes(app, deps.chatsRoutes);
  registerBackupRoutes(app, deps.backupRoutes);
  registerIncidentRoutes(app, deps.incidentRoutes);
  registerResilienceRoutes(app, deps.resilienceRoutes);
  registerStorageRoutes(app, deps.storageRoutes);
  registerConfigRoutes(app, deps.configRoutes);
  registerApprovalRoutes(app, deps.approvalRoutes);
  registerAuditRoutes(app, deps.auditRoutes);
  registerObservabilityRoutes(app, deps.observabilityRoutes);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Endpoint nao encontrado" });
  });

  app.get("/app", (_req, res) => {
    res.sendFile(path.join(webDir, "index.html"));
  });

  app.get("/produto", (_req, res) => {
    res.sendFile(path.join(webDir, "produto.html"));
  });

  app.get("/guia", (_req, res) => {
    res.sendFile(path.join(webDir, "guia.html"));
  });

  app.get("/", (_req, res) => {
    res.sendFile(path.join(webDir, "index.html"));
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
