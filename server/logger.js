import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";

// Create base logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
      singleLine: false,
    },
  },
});

// Middleware for HTTP logging with trace ID
export function createHttpLogger() {
  return pinoHttp(
    {
      logger,
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          remoteAddress: req.socket?.remoteAddress,
          userAgent: req.headers?.["user-agent"],
          traceId: req.traceId,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
          responseTime: res?.responseTime,
        }),
      },
      customAttributeKeys: {
        req: "request",
        res: "response",
        err: "error",
        responseTime: "duration_ms",
      },
      requestIdHeader: "x-trace-id",
      requestIdLogLabel: "traceId",
      genReqId: () => randomUUID(),
    },
    logger,
  );
}

// Attach logger to request for use in route handlers
export function attachTraceId(req, res, next) {
  req.logger = logger.child({ traceId: req.id });
  next();
}

// Main logger for application
export default logger;
