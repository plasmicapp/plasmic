import { Logger } from "@/wab/shared/observability/Logger";
import {
  mergeProperties,
  Properties,
} from "@/wab/shared/observability/Properties";

export class ConsoleLogLogger implements Logger {
  constructor(private readonly loggingContext?: Properties) {}

  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    payload?: Properties
  ) {
    if (this.loggingContext) {
      console[level](`[logger.child]`, this.loggingContext);
    }

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

  child(loggingContext: Properties): Logger {
    return new ConsoleLogLogger(
      mergeProperties(this.loggingContext, loggingContext)
    );
  }
}
