import { context, propagation, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import * as Sentry from "@sentry/node";
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

const dsn = "http://public@127.0.0.1/1";

afterEach(async () => {
  await Sentry.close(1000);
  Sentry.getCurrentScope().setClient(undefined);
  Sentry.getCurrentScope().clear();
  Sentry.getIsolationScope().clear();
  context.disable();
  trace.disable();
  propagation.disable();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("initObservability", () => {
  it("only reads the supplied environment and normalizes service metadata", () => {
    vi.stubEnv("OTEL_SERVICE_NAME", "from-process");
    vi.stubEnv("PINO_LOGGER_LEVEL", "silent");
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const { logger } = initObservability("default", " production ", {
      OTEL_SERVICE_NAME: " mini-cache ",
      HOSTNAME: "pod-a",
      PINO_LOGGER_LEVEL: "",
    });
    logger.debug("default level");
    expect(JSON.parse(String(write.mock.calls[0][0]))).toMatchObject({
      serviceName: "mini-cache",
      environment: "production",
      podName: "pod-a",
      level: "debug",
      message: "default level",
    });
  });

  it("uses console logging outside production", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    initObservability("test", "development", {}).logger.info("hello");
    expect(info).toHaveBeenCalledWith("[logger.info] hello", {
      serviceName: "test",
      environment: "development",
      podName: "",
    });
  });

  it("leaves Sentry and the injected context untouched until explicitly initialized", () => {
    context.setGlobalContextManager(new AsyncLocalStorageContextManager());
    const active = context
      .active()
      .setValue(Symbol("test-context"), "existing");
    context.with(active, () => {
      initObservability("test", "production", { SENTRY_DSN: dsn });
      expect(context.active()).toBe(active);
    });
    expect(Sentry.getClient()).toBeUndefined();
  });

  it.each([
    [" ", "test"],
    ["test", " "],
  ])("rejects blank identifiers (%s, %s)", (name, environment) => {
    expect(() => initObservability(name, environment, {})).toThrow(
      "Observability requires a serviceName and environment",
    );
  });

  it("keeps error reporting disabled without a DSN", () => {
    initObservability("test", "test", {}).initErrorReporting();
    expect(Sentry.getClient()).toBeUndefined();
  });

  it("rejects a blank DSN", () => {
    expect(() =>
      initObservability("test", "test", {
        SENTRY_DSN: " ",
      }).initErrorReporting(),
    ).toThrow("Sentry requires a nonblank SENTRY_DSN");
    expect(Sentry.getClient()).toBeUndefined();
  });

  it.each(["NaN", "Infinity", "-0.1", "1.1"])(
    "rejects an invalid sample rate (%s)",
    (rate) => {
      expect(() =>
        initObservability("test", "test", {
          SENTRY_DSN: dsn,
          SENTRY_TRACE_SAMPLE_RATE: rate,
        }).initErrorReporting(),
      ).toThrow("Sentry tracesSampleRate must be between 0 and 1");
      expect(Sentry.getClient()).toBeUndefined();
    },
  );

  it.each([undefined, "explicit"])(
    "uses the shared Sentry policy (environment=%s)",
    (environment) => {
      const beforeSend = vi.fn((event: Sentry.ErrorEvent) => event);
      initObservability("test", "test", {
        SENTRY_DSN: ` ${dsn} `,
        SENTRY_ENVIRONMENT: environment,
        SENTRY_TRACE_SAMPLE_RATE: "0.25",
      }).initErrorReporting(beforeSend);
      expect(Sentry.getClient()?.getOptions()).toMatchObject({
        dsn,
        environment: environment ?? "test",
        tracesSampleRate: 0.25,
        skipOpenTelemetrySetup: true,
        sendDefaultPii: false,
        beforeSend,
      });
    },
  );

  it("rejects reinitialization without replacing Sentry or its context", () => {
    const { initErrorReporting } = initObservability("test", "test", {
      SENTRY_DSN: dsn,
    });
    initErrorReporting();
    const client = Sentry.getClient();
    const active = context.active();
    expect(initErrorReporting).toThrow(
      "Sentry is already initialized in this process",
    );
    expect(Sentry.getClient()).toBe(client);
    expect(context.active()).toBe(active);
  });

  it("respects the configured log level inside asynchronous contexts", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const { logger, withLogContext } = initObservability("test", "production", {
      PINO_LOGGER_LEVEL: "warn",
    });
    await withLogContext({ requestId: "request-a" }, async () => {
      await Promise.resolve();
      logger.info("filtered");
      logger.warn("retained");
    });
    expect(write).toHaveBeenCalledOnce();
    expect(JSON.parse(String(write.mock.calls[0][0]))).toMatchObject({
      serviceName: "test",
      requestId: "request-a",
      level: "warn",
      message: "retained",
    });
  });
});
