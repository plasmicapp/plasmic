import { context, diag, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OtelLogSink } from "./OtelLogSink";
import type { Properties } from "./Properties";

let exporter: InMemorySpanExporter;
let provider: BasicTracerProvider;

beforeEach(() => {
  exporter = new InMemorySpanExporter();
  provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  trace.setGlobalTracerProvider(provider);
  context.setGlobalContextManager(
    new AsyncLocalStorageContextManager().enable(),
  );
  vi.spyOn(diag, "warn");
});

afterEach(async () => {
  vi.restoreAllMocks();
  await provider.shutdown();
  context.disable();
  trace.disable();
});

function logOnSpan(payload: Properties) {
  const span = trace.getTracer("test-service").startSpan("operation");
  context.with(trace.setSpan(context.active(), span), () => {
    new OtelLogSink().error("failed", payload);
  });
  span.end();
  return {
    attributes: exporter.getFinishedSpans()[0].events[0].attributes,
  };
}

describe("OtelLogSink", () => {
  it("preserves supported attributes and formats objects without SDK warnings", () => {
    const details: Properties = { status: 503 };
    details.self = details;
    const { attributes } = logOnSpan({
      requestId: "request-a",
      count: 0,
      retryable: false,
      strings: ["a", "b"],
      numbers: [1, 2],
      booleans: [true, false],
      details,
      mixed: [1, "two"],
      missing: undefined,
      "": "invalid",
    });
    expect(attributes).toEqual({
      level: "error",
      requestId: "request-a",
      count: 0,
      retryable: false,
      strings: ["a", "b"],
      numbers: [1, 2],
      booleans: [true, false],
      details: expect.any(String),
      mixed: expect.any(String),
    });
    expect(attributes?.details).toContain("status: 503");
    expect(attributes?.details).toContain("Circular");
    expect(diag.warn).not.toHaveBeenCalled();
    expect(details.self).toBe(details);
  });

  it("does not read payloads without a recording span", () => {
    const readDetails = vi.fn(() => ({}));
    const payload = {
      get details() {
        return readDetails();
      },
    };
    const sink = new OtelLogSink();
    sink.info("outside", payload);
    context.with(
      trace.setSpanContext(context.active(), {
        traceId: "12345678901234567890123456789012",
        spanId: "1234567890123456",
        traceFlags: 0,
      }),
      () => sink.info("non-recording", payload),
    );
    expect(readDetails).not.toHaveBeenCalled();
    expect(exporter.getFinishedSpans()).toEqual([]);
  });
});
