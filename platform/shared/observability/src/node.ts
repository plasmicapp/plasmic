import { Attributes, context, Span } from "@opentelemetry/api";
import * as Sentry from "@sentry/node";
import { AsyncLocalStorage } from "node:async_hooks";
import { ConsoleLogSink } from "./ConsoleLogSink";
import { ContextualLogger } from "./ContextualLogger";
import { OtelLogSink } from "./OtelLogSink";
import { PinoLogSink } from "./PinoLogSink";
import { mergeProperties, Properties } from "./Properties";
import { withSpan } from "./tracing";

export {
  expressRequestContextMiddleware,
  honoRequestContextMiddleware,
} from "./request-context";

export function initObservability(
  serviceName: string,
  environment: string,
  env: NodeJS.ProcessEnv,
) {
  serviceName = (env.OTEL_SERVICE_NAME || serviceName).trim();
  environment = environment.trim();
  if (!serviceName || !environment) {
    throw new Error("Observability requires a serviceName and environment");
  }

  const outputLogger =
    environment === "production"
      ? new PinoLogSink(env.PINO_LOGGER_LEVEL || "debug")
      : new ConsoleLogSink();
  const logContext = new AsyncLocalStorage<Properties>();
  const getLogContext = () =>
    mergeProperties(
      { serviceName, environment, podName: env.HOSTNAME ?? "" },
      logContext.getStore(),
    );
  const logger = new ContextualLogger(
    [outputLogger, new OtelLogSink()],
    getLogContext,
  );
  const withLogContext = <T>(properties: Properties, fn: () => T): T =>
    logContext.run(Object.assign({}, logContext.getStore(), properties), fn);

  function initErrorReporting(beforeSend?: Sentry.NodeOptions["beforeSend"]) {
    if (!env.SENTRY_DSN) {
      return;
    }
    const dsn = env.SENTRY_DSN.trim();
    if (!dsn) {
      throw new Error("Sentry requires a nonblank SENTRY_DSN");
    }
    const tracesSampleRate =
      env.SENTRY_TRACE_SAMPLE_RATE === undefined
        ? undefined
        : Number(env.SENTRY_TRACE_SAMPLE_RATE);
    if (
      tracesSampleRate !== undefined &&
      (!Number.isFinite(tracesSampleRate) ||
        tracesSampleRate < 0 ||
        tracesSampleRate > 1)
    ) {
      throw new Error("Sentry tracesSampleRate must be between 0 and 1");
    }
    if (Sentry.getClient()) {
      throw new Error("Sentry is already initialized in this process");
    }
    Sentry.init({
      dsn,
      environment: env.SENTRY_ENVIRONMENT ?? environment,
      tracesSampleRate,
      skipOpenTelemetrySetup: true,
      sendDefaultPii: false,
      beforeSend,
    });
    context.disable();
    if (!context.setGlobalContextManager(new Sentry.SentryContextManager())) {
      throw new Error(
        "Failed to register the Sentry context manager; @opentelemetry/api must match the injected SDK version",
      );
    }
  }

  return {
    logger,
    withLogContext,
    withSpan: <T>(
      name: string,
      fn: (span: Span) => Promise<T>,
      attributes?: Attributes,
    ) => withSpan(name, fn, { tracer: serviceName, attributes }),
    initErrorReporting,
  };
}
