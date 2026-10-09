import type { Logger } from "./Logger";
import { mergeProperties, Properties } from "./Properties";

/** Sends the same context to each sink while keeping the exported logger stable. */
export class ContextualLogger implements Logger {
  constructor(
    private readonly sinks: readonly Logger[],
    private readonly getContext: () => Properties | undefined,
  ) {}

  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    payload?: Properties,
  ) {
    const properties = mergeProperties(
      this.getContext(),
      payload instanceof Error ? { error: payload } : payload,
    );
    for (const sink of this.sinks) {
      sink[level](message, properties);
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
