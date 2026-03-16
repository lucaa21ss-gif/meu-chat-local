import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";

const logLevel = process.env.LOG_LEVEL || "info";
const isProduction = process.env.NODE_ENV === "production";

// In production we keep JSON logs; in development we enable pretty output.
const logger = isProduction
  ? pino({ level: logLevel })
  : pino({
      level: logLevel,
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

// Main logger for application
export default logger;
