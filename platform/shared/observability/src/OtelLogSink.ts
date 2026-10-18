import type { AttributeValue, Attributes } from "@opentelemetry/api";
import { context, trace } from "@opentelemetry/api";
import { isAttributeValue } from "@opentelemetry/core";
import { inspect } from "node:util";
import type { Logger } from "./Logger";
import type { Properties } from "./Properties";
import { redactError } from "./redactError";

/** Writes log events to the active span, independently of the console sink. */
export class OtelLogSink implements Logger {
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    payload?: Properties,
  ) {
    const span = trace.getSpan(context.active());
    if (!span?.isRecording()) {
      return;
    }
    const attributes: Attributes = {};
    for (const [key, value] of Object.entries({ level, ...payload })) {
      if (key && value !== undefined) {
        attributes[key] = formatSpanAttribute(value);
      }
    }
    span.addEvent(message, attributes);
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

function formatSpanAttribute(value: unknown): AttributeValue {
  if (value != null && isAttributeValue(value)) {
    return value;
  }
  try {
    const inspectOptions = {
      depth: null,
      maxArrayLength: null,
      maxStringLength: null,
      customInspect: false,
    };
    return inspect(
      value instanceof Error ? redactError(value) : value,
      inspectOptions,
    );
  } catch {
    return "[Unserializable]";
  }
}
