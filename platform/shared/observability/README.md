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

Passing an `Error` as the log payload wraps it under `error`. JSON output includes
its custom fields, name, message, and stack, just as when passed as `{ error }`.
Error properties remain inside `error`, preserving the log message and logging context.
Pino and span events serialize top-level Error values (including `error` and `err`)
as plain objects containing name, message, stack, primitive custom fields and
`details`. Error causes use the same filtering, primitive causes are preserved,
and circular causes become `[Circular]`. Other object-valued causes and fields
are omitted because request configs and headers can carry credentials. `details`
is explicitly retained as supplied; callers must keep it free of credentials.
This is error-field filtering, not general redaction of arbitrary log payloads.

Span events keep scalar attributes and homogeneous arrays in their original types.
Other values use Node's `util.inspect` to produce readable text, including error
details, causes, bigints, and circular references. Inspection has no depth, array,
or string length limit and does not call custom inspection hooks. A value that
throws during inspection becomes `[Unserializable]`. Undefined values and empty
attribute keys are omitted. Conversion is skipped without a recording span.
Pino output remains structured JSON.

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
