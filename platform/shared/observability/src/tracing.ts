import { Attributes, Span, SpanStatusCode, trace } from "@opentelemetry/api";

export async function flushTraces(timeoutMs = 1000): Promise<void> {
  const registeredProvider = trace.getTracerProvider();
  const provider: unknown =
    "getDelegate" in registeredProvider &&
    typeof registeredProvider.getDelegate === "function"
      ? registeredProvider.getDelegate()
      : registeredProvider;
  if (
    !provider ||
    typeof provider !== "object" ||
    !("forceFlush" in provider) ||
    typeof provider.forceFlush !== "function"
  ) {
    return;
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      provider.forceFlush(),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, timeoutMs);
      }),
    ]);
  } catch {
    // An exporter failure must not replace the subprocess result.
  } finally {
    clearTimeout(timeout);
  }
}

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  opts?: { tracer?: string; attributes?: Attributes },
): Promise<T> {
  const tracer = trace.getTracer(opts?.tracer ?? "app");
  return tracer.startActiveSpan(
    name,
    { attributes: opts?.attributes },
    async (span) => {
      try {
        return await fn(span);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.recordException(error);
        throw err;
      } finally {
        span.end();
      }
    },
  );
}
