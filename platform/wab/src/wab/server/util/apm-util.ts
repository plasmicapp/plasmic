import { logger } from "@/wab/server/observability";
import { WabPromTimer } from "@/wab/server/promstats";
import { trace } from "@opentelemetry/api";

/**
 * Carrier object used to propagate OpenTelemetry trace context across
 * process/thread boundaries (e.g. worker pool, bwrap subprocesses) via
 * `propagation.inject` / `propagation.extract`.
 */
export interface TraceCarrier {
  traceparent?: string;
  tracestate?: string;
  baggage?: string;
  [key: string]: string | undefined;
}

/**
 * Keys that may hold OpenTelemetry trace context when propagated
 */
const TRACE_CARRIER_KEYS = ["traceparent", "tracestate", "baggage"] as const;

/**
 * Builds a {@link TraceCarrier} containing only the trace-context keys found
 * in `source` (e.g. `process.env`), so we can call `propagation.extract`
 * without leaking the rest of the environment into the carrier.
 */
export function pickTraceCarrier(
  source: Record<string, string | undefined>
): TraceCarrier {
  const carrier: TraceCarrier = {};
  for (const key of TRACE_CARRIER_KEYS) {
    const value = source[key];
    if (value !== undefined) {
      carrier[key] = value;
    }
  }
  return carrier;
}

export async function withSpan<T>(
  name: string,
  f: () => Promise<T>,
  msg?: string
) {
  const suffix = msg ? `: ${msg}` : "";

  const start = new Date().getTime();
  logger().debug(`span "${name}" started at ${start}${suffix}`);

  const promTimer = new WabPromTimer(name);
  const tracer = trace.getTracer("app");
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await f();
      logger().info(
        `span "${name}" finished in ${new Date().getTime() - start}ms${suffix}`
      );
      return result;
    } catch (err) {
      logger().error(
        `span "${name}" failed in ${new Date().getTime() - start}ms${suffix}`
      );
      throw err;
    } finally {
      promTimer.end();
      span.end();
    }
  });
}

export async function withTimeSpent<T>(f: () => Promise<T>): Promise<{
  result: T;
  spentTime: number;
}> {
  const start = new Date().getTime();
  const result = await f();
  return {
    result,
    spentTime: new Date().getTime() - start,
  };
}
