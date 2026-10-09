import type { Logger } from "./Logger";
import type { Properties } from "./Properties";

export class ConsoleLogSink implements Logger {
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    payload?: Properties,
  ) {
    const finalMessage = `[logger.${level}] ${message}`;
    if (payload) {
      console[level](finalMessage, payload);
    } else {
      // Calling with 1 arg avoids printing `undefined` in the log.
      console[level](finalMessage);
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
}
