import { context, trace } from "@opentelemetry/api";
import * as Sentry from "@sentry/node";
import express from "express";
import { once } from "node:events";

vi.mock("@sentry/node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentry/node")>();
  return { ...actual, init: vi.fn(actual.init) };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("keeps Sentry and the injected OTel setup untouched when a worker imports logging", async () => {
  vi.stubEnv("SENTRY_DSN", "http://public@127.0.0.1/1");
  const init = vi.mocked(Sentry.init);
  const disable = vi.spyOn(context, "disable");
  const setContextManager = vi.spyOn(context, "setGlobalContextManager");
  const provider = trace.getTracerProvider();
  const exceptionHandlers = process.listeners("uncaughtException");
  const rejectionHandlers = process.listeners("unhandledRejection");

  const { logger } = await import("@/wab/server/observability");
  const { shouldIgnoreErrorByMessage } =
    await import("@/wab/server/observability/sentry-filters");

  expect(logger).toBeDefined();
  expect(shouldIgnoreErrorByMessage("CSRF token mismatch")).toBe(true);
  expect(init).not.toHaveBeenCalled();
  expect(Sentry.getClient()).toBeUndefined();
  expect(disable).not.toHaveBeenCalled();
  expect(setContextManager).not.toHaveBeenCalled();
  expect(trace.getTracerProvider()).toBe(provider);
  expect(process.listeners("uncaughtException")).toEqual(exceptionHandlers);
  expect(process.listeners("unhandledRejection")).toEqual(rejectionHandlers);
});

it.each([false, true])(
  "propagates concurrent WAB request context (upstream ID: %s)",
  async (upstreamId) => {
    const { addLoggingMiddleware } = await import("@/wab/server/AppServer");
    const { logger } = await import("@/wab/server/observability");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const app = express();
    addLoggingMiddleware(app);

    let arrivals = 0;
    let release: () => void = () => undefined;
    const bothStarted = new Promise<void>((resolve) => {
      release = resolve;
    });
    app.get("/context/:owner", async (req, res) => {
      if (++arrivals === 2) {
        release();
      }
      await bothStarted;
      logger.info("route work", { owner: req.params.owner });
      res.send(req.params.owner);
    });

    const server = app.listen(0, "127.0.0.1");
    try {
      await once(server, "listening");
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Expected a TCP server address");
      }
      const responses = await Promise.all(
        ["a", "b"].map(async (owner) => {
          const response = await fetch(
            `http://127.0.0.1:${address.port}/context/${owner}?ignored=query`,
            {
              headers: upstreamId
                ? { "x-request-id": `upstream-${owner}` }
                : {},
            },
          );
          return response.text();
        }),
      );
      expect(responses).toEqual(["a", "b"]);
      const logs = info.mock.calls
        .filter(([message]) => message === "[logger.info] route work")
        .map(([, properties]) => properties);
      expect(logs).toHaveLength(2);
      for (const owner of ["a", "b"]) {
        expect(logs.find((log) => log.owner === owner)).toEqual({
          serviceName: "wab",
          environment: "test",
          podName: process.env.HOSTNAME ?? "",
          owner,
          requestId: upstreamId ? `upstream-${owner}` : expect.any(String),
          requestMethod: "GET",
          requestPath: `/context/${owner}`,
        });
      }
      expect(new Set(logs.map((log) => log.requestId)).size).toBe(2);
      logger.info("outside request");
      expect(info).toHaveBeenLastCalledWith("[logger.info] outside request", {
        serviceName: "wab",
        environment: "test",
        podName: process.env.HOSTNAME ?? "",
      });
    } finally {
      release();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
);
