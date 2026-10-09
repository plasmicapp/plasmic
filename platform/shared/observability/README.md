# @plasmic-shared/observability

## Backend initialization

Services pass their name, environment, and environment variables directly:

```ts
import { initObservability } from "@plasmic-shared/observability/node";

export const { logger, withSpan, withLogContext, initErrorReporting } =
  initObservability(
    "my-service",
    process.env.NODE_ENV || "development",
    process.env,
  );
```

The library standardizes console logging outside production and Pino in production.
Service metadata is shared by both logging and span events. Environment variables
are read only from the supplied object; `OTEL_SERVICE_NAME` overrides the default name.

Importing a logger never initializes Sentry. HTTP entry points explicitly call
`initErrorReporting()`, optionally supplying a Sentry `beforeSend` filter. Without a
DSN this is a no-op. Sentry uses the supplied environment and sampling settings,
disables default PII collection, and leaves tracing to the deployment's injected SDK.
Its context manager isolates concurrent requests while preserving the existing
tracer provider and exporters. Do not initialize Sentry twice in one process.

## Logging context and spans

```ts
await withLogContext({ requestId: "request-a" }, () =>
  withSpan("load-project", async () => {
    withLogContext({ component: "loader" }, () => logger.info("Loaded"));
  }),
);
```

`withLogContext` uses `AsyncLocalStorage` for synchronous and asynchronous work,
including concurrent requests. Properties merge shallowly in this order: service metadata,
nested async context, log payload. Later values win, including `undefined`.
The output logger and active span events receive the same logging context.
Nested contexts restore their parent on return or failure.

`withSpan` uses the service name as its tracer name. Its optional third argument
sets span attributes independently of logging context. It ends spans on success
and failure, records normalized `Error` exceptions, and rethrows the original value.
Logging context works without Sentry or a tracing SDK.

Short-lived subprocesses can await `flushTraces()` from the root entry point
before exiting. It flushes the existing SDK, waits at most one second, and
preserves the subprocess result if exporting fails. Without an SDK it is a no-op.

## HTTP request context

Import `expressRequestContextMiddleware` or `honoRequestContextMiddleware` from
`@plasmic-shared/observability/node`, pass the service's `withLogContext` to it,
and register the result as the first application middleware:

```ts
import { expressRequestContextMiddleware } from "@plasmic-shared/observability/node";

app.use(expressRequestContextMiddleware(withLogContext));
```

Both attach the method, path, and request ID
to asynchronous logging context. They reuse a valid upstream `x-request-id`, or
create a UUID when it is absent or invalid, and set that header on the incoming
request so proxies can forward it. Express also sets `req.id`.

Request IDs may contain letters, numbers, dots, underscores, colons, and hyphens,
up to 128 characters. They identify a request for logging; they are not credentials.

## Browser logging

Use `ConsoleLogSink`, `Logger`, and `Properties` from
`@plasmic-shared/observability`. This entry point also exports `mergeProperties`
and trace-carrier utilities; it imports no Pino, Sentry, or Node async hooks.
Backend initialization is available only through `/node`.
