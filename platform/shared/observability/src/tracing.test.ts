import { context, SpanStatusCode, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import * as injectedApi from "otel-api-injected";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickTraceCarrier } from "./TraceCarrier";
import { flushTraces, withSpan } from "./tracing";

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
});

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await provider.shutdown();
  context.disable();
  trace.disable();
});

describe("flushTraces", () => {
  it.each([
    ["application", trace],
    ["injected", injectedApi.trace],
  ] as const)(
    "exports queued spans from the %s API's provider",
    async (_, api) => {
      await provider.shutdown();
      trace.disable();
      exporter = new InMemorySpanExporter();
      provider = new BasicTracerProvider({
        spanProcessors: [
          new BatchSpanProcessor(exporter, { scheduledDelayMillis: 60_000 }),
        ],
      });
      expect(api.setGlobalTracerProvider(provider)).toBe(true);
      const registeredProvider = trace.getTracerProvider();
      trace.getTracer("html-subprocess").startSpan("render").end();
      expect(exporter.getFinishedSpans()).toHaveLength(0);

      await flushTraces();

      expect(exporter.getFinishedSpans().map((span) => span.name)).toEqual([
        "render",
      ]);
      expect(trace.getTracerProvider()).toBe(registeredProvider);
    },
  );

  it("does not initialize a provider when tracing is disabled", async () => {
    trace.disable();
    const registeredProvider = trace.getTracerProvider();
    await expect(flushTraces()).resolves.toBeUndefined();
    expect(trace.getTracerProvider()).toBe(registeredProvider);
  });

  it("does not fail the caller when an exporter rejects", async () => {
    vi.spyOn(provider, "forceFlush").mockRejectedValue(
      new Error("export failed"),
    );
    await expect(flushTraces()).resolves.toBeUndefined();
  });

  it("bounds the wait for an exporter that never finishes", async () => {
    vi.useFakeTimers();
    vi.spyOn(provider, "forceFlush").mockImplementation(
      () => new Promise(() => {}),
    );
    const finished = vi.fn();
    const flushing = flushTraces().then(finished);
    await vi.advanceTimersByTimeAsync(999);
    expect(finished).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await flushing;
    expect(finished).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("withSpan", () => {
  it("activates and ends the configured span while returning the result", async () => {
    const result = await withSpan(
      "test",
      async (span) => {
        await Promise.resolve();
        expect(trace.getSpan(context.active())).toBe(span);
        expect(span.isRecording()).toBe(true);
        return 42;
      },
      { tracer: "custom", attributes: { operation: "load" } },
    );
    expect(result).toBe(42);
    expect(exporter.getFinishedSpans()).toHaveLength(1);
    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe("test");
    expect(span.instrumentationScope.name).toBe("custom");
    expect(span.attributes).toEqual({ operation: "load" });
    expect(span.status.code).toBe(SpanStatusCode.UNSET);
    expect(trace.getSpan(context.active())).toBeUndefined();
  });

  it("records and rethrows the same Error, then ends the span", async () => {
    const err = new Error("boom");
    await expect(
      withSpan("test", async () => {
        throw err;
      }),
    ).rejects.toBe(err);
    const [span] = exporter.getFinishedSpans();
    expect(span.status).toEqual({
      code: SpanStatusCode.ERROR,
      message: "boom",
    });
    expect(span.events).toEqual([
      expect.objectContaining({
        name: "exception",
        attributes: expect.objectContaining({ "exception.message": "boom" }),
      }),
    ]);
    expect(trace.getSpan(context.active())).toBeUndefined();
  });

  it.each(["boom", 42, null, undefined, { code: "failure" }])(
    "records a normalized exception and rethrows the original value (%s)",
    async (value) => {
      await expect(
        withSpan("test", async () => {
          throw value;
        }),
      ).rejects.toBe(value);
      const [span] = exporter.getFinishedSpans();
      expect(span.status).toEqual({
        code: SpanStatusCode.ERROR,
        message: String(value),
      });
      expect(span.events).toEqual([
        expect.objectContaining({
          name: "exception",
          attributes: expect.objectContaining({
            "exception.message": String(value),
          }),
        }),
      ]);
      expect(trace.getSpan(context.active())).toBeUndefined();
    },
  );
});

describe("pickTraceCarrier", () => {
  it("picks only the trace-context keys", () => {
    expect(
      pickTraceCarrier({
        traceparent: "tp",
        tracestate: "ts",
        baggage: "bg",
        PATH: "/usr/bin",
        SECRET: "shh",
      }),
    ).toEqual({ traceparent: "tp", tracestate: "ts", baggage: "bg" });
  });

  it("omits keys that are absent", () => {
    expect(pickTraceCarrier({ traceparent: "tp" })).toEqual({
      traceparent: "tp",
    });
    expect(pickTraceCarrier({ traceparent: undefined })).toEqual({});
    expect(pickTraceCarrier({})).toEqual({});
  });
});
