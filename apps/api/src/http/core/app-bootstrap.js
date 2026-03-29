import compression from "compression";
import cors from "cors";
import helmet from "helmet";

export function buildCorsOriginValidator(configuredOrigin, parseOriginList, HttpError) {
  if (configuredOrigin === true || configuredOrigin === false) {
    return configuredOrigin;
  }

  const configuredOrigins = Array.isArray(configuredOrigin)
    ? configuredOrigin.map((origin) => String(origin).trim()).filter(Boolean)
    : parseOriginList(configuredOrigin);

  const allowlist = new Set(
    configuredOrigins.length
      ? configuredOrigins
      : ["http://localhost:4000", "http://127.0.0.1:4000"],
  );

  return (origin, callback) => {
    const isAllowed = !origin || allowlist.has(origin);

    if (isAllowed) {
      callback(null, true);
      return;
    }

    callback(new HttpError(403, "Origem nao permitida pelo CORS"));
  };
}

export function configureAppBootstrap(app, {
  corsOrigin,
  webDir,
  roleLimiter,
  createHttpLogger,
  logger,
  createTelemetryMiddleware,
  express,
}) {
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: process.env.JSON_LIMIT || "32mb" }));
  app.use(compression());
  app.use(createHttpLogger());
  app.use((req, _res, next) => {
    req.logger = logger.child({ traceId: req.id });
    next();
  });
  app.use((req, res, next) => {
    if (req.id) {
      res.setHeader("x-trace-id", req.id);
    }
    next();
  });
  app.use(createTelemetryMiddleware());
  app.use(
    express.static(webDir, {
      maxAge: "1d",
      etag: false,
      dotfiles: "ignore",
      redirect: false,
    }),
  );
  app.use("/api", roleLimiter.createMiddleware("api"));

  ["/api/chat", "/api/chat-stream"].forEach((routePath) => {
    app.use(routePath, roleLimiter.createMiddleware("chat"));
  });
}

export function attachAppLocals(app, locals = {}) {
  Object.assign(app.locals, locals);
}
