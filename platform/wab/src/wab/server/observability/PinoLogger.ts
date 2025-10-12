import { Logger } from "@/wab/shared/observability/Logger";
import {
  mergeProperties,
  Properties,
} from "@/wab/shared/observability/Properties";
import { context, trace } from "@opentelemetry/api";
import pino, { Logger as PinoLog } from "pino";

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "unknown-service";
const ENVIRONMENT = process.env.NODE_ENV || "development";
const POD_NAME = process.env.HOSTNAME || "";
const PINO_LOGGER_LEVEL = process.env.PINO_LOGGER_LEVEL || "debug";

export class PinoLogger implements Logger {
  private readonly pinoLogger: PinoLog;

  constructor(private readonly loggingContext?: Properties) {
    this.pinoLogger = pino({
      level: PINO_LOGGER_LEVEL,
      formatters: {
        level: (label) => ({ level: label }),
        log: (logObj) => logObj,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        serviceName: SERVICE_NAME,
        environment: ENVIRONMENT,
        podName: POD_NAME,
        ...loggingContext,
      },
    });
  }

  private log(
    level: "info" | "error" | "warn" | "debug",
    message: string,
    payload?: Record<string, any>
  ) {
    const logEntry = {
      message,
      ...payload,
    };

    this.pinoLogger[level](logEntry);

    const span = trace.getSpan(context.active());
    if (span) {
      span.addEvent(message, {
        level,
        ...payload,
      });
    }
  }

  info(message: string, payload?: Properties) {
    this.log("info", message, payload);
  }
  error(message: string, payload?: Properties) {
    this.log("error", message, payload);
  }
  warn(message: string, payload?: Properties) {
    this.log("warn", message, payload);
  }
  debug(message: string, payload?: Properties) {
    this.log("debug", message, payload);
  }

  child(loggingContext: Properties): Logger {
    return new PinoLogger(mergeProperties(this.loggingContext, loggingContext));
  }
}
