import { context, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OtelLogSink } from "./OtelLogSink";
import { PinoLogSink } from "./PinoLogSink";
import type { Properties } from "./Properties";
import { initObservability } from "./node";

const metadata = {
  serviceName: "test-service",
  environment: "production",
  podName: "",
};

let exporter: InMemorySpanExporter;
let provider: BasicTracerProvider;
let logs: Properties[];

beforeEach(() => {
  logs = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    logs.push(JSON.parse(String(chunk)));
    return true;
  });
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
  vi.restoreAllMocks();
  await provider.shutdown();
  context.disable();
  trace.disable();
});

describe("logging context", () => {
  it("preserves bare Error payloads alongside logging context", async () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    const { logger, withLogContext } = initObservability(
      "test-service",
      "test",
      {},
    );
    const error = new Error("boom");
    await withLogContext({ requestId: "request-a" }, async () => {
      await Promise.resolve();
      withLogContext({ component: "cache" }, () =>
        logger.error("failed", error),
      );
    });
    expect(output).toHaveBeenCalledWith("[logger.error] failed", {
      ...metadata,
      environment: "test",
      requestId: "request-a",
      component: "cache",
      error,
    });
    expect(output.mock.calls[0][1].error).toBe(error);
  });

  it("shares service metadata, nested async and payload context between JSON and span events", async () => {
    const { logger, withLogContext, withSpan } = initObservability(
      "test-service",
      "production",
      {},
    );

    await withLogContext({ requestId: "request-a" }, () =>
      withSpan(
        "operation",
        async () => {
          await Promise.resolve();
          withLogContext({ component: "cache", task: "load" }, () =>
            logger.info("loaded", { task: "done" }),
          );
        },
        { operationId: "operation-a" },
      ),
    );

    const properties = {
      ...metadata,
      requestId: "request-a",
      component: "cache",
      task: "done",
    };
    expect(logs).toEqual([
      expect.objectContaining({ message: "loaded", ...properties }),
    ]);
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes).toEqual({
      operationId: "operation-a",
    });
    expect(span.events).toEqual([
      expect.objectContaining({
        name: "loaded",
        attributes: { level: "info", ...properties },
      }),
    ]);
  });

  it("isolates concurrent operations and restores the parent after nested spans", async () => {
    const { logger, withLogContext, withSpan } = initObservability(
      "test-service",
      "production",
      {},
    );
    let arrivals = 0;
    let release = () => {};
    const bothStarted = new Promise<void>((resolve) => {
      release = resolve;
    });

    await Promise.all(
      ["a", "b"].map((id) =>
        withLogContext({ requestId: id }, () =>
          withSpan(
            "request",
            async () => {
              if (++arrivals === 2) {
                release();
              }
              await bothStarted;
              await withLogContext({ requestId: `${id}-nested` }, () =>
                withSpan(
                  "nested",
                  async () => {
                    await Promise.resolve();
                    logger.info("nested", { owner: id });
                  },
                  { requestId: `${id}-nested` },
                ),
              );
              logger.info("parent", { owner: id });
            },
            { requestId: id },
          ),
        ),
      ),
    );
    logger.info("outside");

    for (const id of ["a", "b"]) {
      expect(
        logs.find((log) => log.message === "nested" && log.owner === id)
          ?.requestId,
      ).toBe(`${id}-nested`);
      expect(
        logs.find((log) => log.message === "parent" && log.owner === id)
          ?.requestId,
      ).toBe(id);
    }
    expect(
      logs.find((log) => log.message === "outside")?.requestId,
    ).toBeUndefined();
    for (const span of exporter.getFinishedSpans()) {
      expect(span.events).toHaveLength(1);
      expect(span.events[0].attributes?.requestId).toBe(
        span.attributes.requestId,
      );
    }
  });

  it("restores context after asynchronous failures and synchronous throws", async () => {
    const { logger, withLogContext, withSpan } = initObservability(
      "test-service",
      "production",
      {},
    );
    await withLogContext({ requestId: "parent" }, async () => {
      await expect(
        withLogContext({ requestId: "child" }, () =>
          withSpan("failure", async () => {
            await Promise.resolve();
            logger.error("failed");
            throw new Error("failure");
          }),
        ),
      ).rejects.toThrow("failure");
      logger.info("restored");
    });
    expect(() =>
      withLogContext({ requestId: "sync" }, () => {
        throw new Error("sync failure");
      }),
    ).toThrow("sync failure");
    logger.info("outside");

    expect(
      logs.map(({ message, requestId }) => ({ message, requestId })),
    ).toEqual([
      { message: "failed", requestId: "child" },
      { message: "restored", requestId: "parent" },
      { message: "outside", requestId: undefined },
    ]);
  });

  it("keeps logging context without Sentry or an OpenTelemetry context manager", async () => {
    context.disable();
    trace.disable();
    const { logger, withLogContext, withSpan } = initObservability(
      "test-service",
      "production",
      {},
    );
    await withLogContext({ requestId: "request-a" }, () =>
      withSpan("operation", async () => {
        await Promise.resolve();
        logger.info("inside");
      }),
    );
    logger.info("outside");
    expect(logs[0].requestId).toBe("request-a");
    expect(logs[1].requestId).toBeUndefined();
  });

  it("keeps the context of independent observability instances separate", async () => {
    const first = initObservability("test-service", "production", {});
    const second = initObservability("other-service", "production", {});
    await first.withLogContext({ requestId: "first" }, async () => {
      await Promise.resolve();
      first.logger.info("first");
      second.logger.info("second");
    });
    expect(logs[0].requestId).toBe("first");
    expect(logs[1]).toMatchObject({
      serviceName: "other-service",
      message: "second",
    });
    expect(logs[1].requestId).toBeUndefined();
  });

  it("records the same context in tracing when using console logging", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { logger, withLogContext, withSpan } = initObservability(
      "test-service",
      "test",
      {},
    );
    await withLogContext({ requestId: "request-a" }, () =>
      withSpan("operation", async () => {
        withLogContext({ component: "cache" }, () => logger.info("loaded"));
      }),
    );
    const properties = {
      ...metadata,
      environment: "test",
      requestId: "request-a",
      component: "cache",
    };
    expect(info).toHaveBeenCalledWith("[logger.info] loaded", properties);
    expect(exporter.getFinishedSpans()[0].events[0].attributes).toEqual({
      level: "info",
      ...properties,
    });
  });

  it("keeps standalone Pino and tracing sinks independent", async () => {
    const { withSpan } = initObservability("test-service", "production", {});
    await withSpan("operation", async () => {
      new PinoLogSink().info("pino only");
      new OtelLogSink().info("trace only", { requestId: "a" });
    });
    expect(logs.map((log) => log.message)).toEqual(["pino only"]);
    expect(exporter.getFinishedSpans()[0].events).toEqual([
      expect.objectContaining({
        name: "trace only",
        attributes: { level: "info", requestId: "a" },
      }),
    ]);
  });
});
