import { context, propagation, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import * as Sentry from "@sentry/node";
import { once } from "node:events";
import { createServer, get } from "node:http";
import * as injectedApi from "otel-api-injected";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initObservability } from "./node";

vi.mock("@sentry/node", async (importOriginal) => {
  const actual = await importOriginal<typeof Sentry>();
  return {
    ...actual,
    init: (options: Sentry.NodeOptions) =>
      actual.init({
        ...options,
        registerEsmLoaderHooks: false,
        sendClientReports: false,
        transport: () => ({ send: async () => ({}), flush: async () => true }),
      }),
  };
});

afterEach(async () => {
  await Sentry.close(1000);
  Sentry.getCurrentScope().setClient(undefined);
  Sentry.getCurrentScope().clear();
  Sentry.getIsolationScope().clear();
  context.disable();
  trace.disable();
  propagation.disable();
});

describe("Sentry with the injected OpenTelemetry API", () => {
  it("isolates concurrent HTTP requests with the injected OTel provider", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const exporter = new InMemorySpanExporter();
    const provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    expect(injectedApi.trace.setGlobalTracerProvider(provider)).toBe(true);
    expect(
      injectedApi.context.setGlobalContextManager(
        new AsyncLocalStorageContextManager(),
      ),
    ).toBe(true);
    const registeredProvider = trace.getTracerProvider();
    const events: Sentry.Event[] = [];
    const scopes = new Map<
      string,
      ReturnType<typeof Sentry.getIsolationScope>
    >();
    const traceIds = new Map<string, string>();
    let arrivals = 0;
    let release = () => {};
    const bothStarted = new Promise<void>((resolve) => {
      release = resolve;
    });

    const observability = initObservability("test-service", "test", {
      SENTRY_DSN: "http://public@127.0.0.1/1",
    });
    observability.initErrorReporting((event) => {
      events.push(event);
      return event;
    });

    const injectedTracer = injectedApi.trace.getTracer("injected-http");
    const server = createServer((req, res) =>
      injectedTracer.startActiveSpan("http.server", (httpSpan) => {
        const id = req.url?.slice(1) ?? "unknown";
        observability
          .withLogContext(id === "untagged" ? {} : { requestId: id }, () =>
            observability.withSpan("request", async (span) => {
              const scope = Sentry.getIsolationScope();
              scopes.set(id, scope);
              traceIds.set(id, span.spanContext().traceId);
              if (id !== "untagged") {
                scope.setTag("requestId", id);
                scope.setUser({ id });
                if (++arrivals === 2) {
                  release();
                }
                await bothStarted;
              }
              expect(
                injectedApi.trace.getSpan(injectedApi.context.active()),
              ).toBe(span);
              observability.logger.info("request-log");
              await observability.withSpan("dependency", async () => {
                await Promise.resolve();
                observability.logger.debug("dependency-log");
              });
              Sentry.captureException(new Error(id));
            }),
          )
          .then(
            () => res.end(id),
            (error) => {
              res.statusCode = 500;
              res.end(String(error));
            },
          )
          .finally(() => httpSpan.end());
      }),
    );

    try {
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Expected a TCP server address");
      }
      const origin = `http://127.0.0.1:${address.port}`;
      const request = (id: string) =>
        new Promise<string>((resolve, reject) => {
          get(`${origin}/${id}`, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => resolve(body));
            res.on("error", reject);
          }).on("error", reject);
        });

      expect(await Promise.all([request("a"), request("b")])).toEqual([
        "a",
        "b",
      ]);
      expect(await request("untagged")).toBe("untagged");
      expect(await Sentry.flush(1000)).toBe(true);
      await provider.forceFlush();

      expect(scopes.get("a")).not.toBe(scopes.get("b"));
      expect(events).toHaveLength(3);
      for (const id of ["a", "b", "untagged"]) {
        const event = events.find(
          (e) => e.exception?.values?.[0]?.value === id,
        );
        expect(event).toBeDefined();
        expect(event?.request?.url).toBe(`${origin}/${id}`);
        expect(event?.contexts?.trace?.trace_id).toBe(traceIds.get(id));
        expect(event?.tags?.requestId).toBe(id === "untagged" ? undefined : id);
        expect(event?.user?.id).toBe(id === "untagged" ? undefined : id);
      }
      expect(
        Sentry.getIsolationScope().getScopeData().tags.requestId,
      ).toBeUndefined();
      expect(trace.getTracerProvider()).toBe(registeredProvider);
      expect(new Set(traceIds.values()).size).toBe(3);
      const requestSpans = exporter
        .getFinishedSpans()
        .filter((s) => s.name === "request");
      expect(requestSpans).toHaveLength(3);
      for (const id of ["a", "b", "untagged"]) {
        const span = requestSpans.find(
          (s) => s.spanContext().traceId === traceIds.get(id),
        );
        const requestId = id === "untagged" ? undefined : id;
        const httpSpan = exporter
          .getFinishedSpans()
          .find(
            (candidate) =>
              candidate.name === "http.server" &&
              candidate.spanContext().traceId === traceIds.get(id),
          );
        expect(httpSpan).toBeDefined();
        expect(span?.parentSpanContext?.spanId).toBe(
          httpSpan?.spanContext().spanId,
        );
        expect(span?.attributes.requestId).toBeUndefined();
        expect(
          span?.events.find((event) => event.name === "request-log")?.attributes
            ?.requestId,
        ).toBe(requestId);
        const child = exporter
          .getFinishedSpans()
          .find(
            (candidate) =>
              candidate.name === "dependency" &&
              candidate.spanContext().traceId === traceIds.get(id),
          );
        expect(child?.parentSpanContext?.spanId).toBe(
          span?.spanContext().spanId,
        );
        expect(child?.events[0].attributes?.requestId).toBe(requestId);
      }
      expect(info.mock.calls).toEqual(
        expect.arrayContaining([
          [
            "[logger.info] request-log",
            expect.objectContaining({ requestId: "a" }),
          ],
          [
            "[logger.info] request-log",
            expect.objectContaining({ requestId: "b" }),
          ],
          [
            "[logger.info] request-log",
            {
              serviceName: "test-service",
              environment: "test",
              podName: "",
            },
          ],
        ]),
      );
      expect(
        requestSpans.every(
          (span) => span.instrumentationScope.name === "test-service",
        ),
      ).toBe(true);
    } finally {
      info.mockRestore();
      release();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await provider.shutdown();
    }
  });
});
