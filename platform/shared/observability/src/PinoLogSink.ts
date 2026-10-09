import pino, { Logger as PinoLog } from "pino";
import type { Logger } from "./Logger";
import type { Properties } from "./Properties";

export class PinoLogSink implements Logger {
  private readonly pinoLogger: PinoLog;

  constructor(level = "debug") {
    this.pinoLogger = pino({
      level,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: null,
    });
  }

  private log(
    level: "info" | "error" | "warn" | "debug",
    message: string,
    payload?: Properties,
  ) {
    const logEntry: Properties = {
      message,
      ...payload,
    };

    if (payload && payload.error instanceof Error) {
      const err: Error = payload.error;
      logEntry.error = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }

    this.pinoLogger[level](logEntry);
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
}
