import { context, trace } from "@opentelemetry/api";
import type { Logger } from "./Logger";
import type { Properties } from "./Properties";

/** Writes log events to the active span, independently of the console sink. */
export class OtelLogSink implements Logger {
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    payload?: Properties,
  ) {
    trace.getSpan(context.active())?.addEvent(message, {
      level,
      ...payload,
    });
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
