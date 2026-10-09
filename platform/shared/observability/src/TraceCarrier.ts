/** W3C trace context passed to workers and sandboxed subprocesses. */
export interface TraceCarrier {
  traceparent?: string;
  tracestate?: string;
  baggage?: string;
  [key: string]: string | undefined;
}

const TRACE_CARRIER_KEYS = ["traceparent", "tracestate", "baggage"] as const;

/** Extracts trace headers from a mixed source such as process.env. */
export function pickTraceCarrier(
  source: Record<string, string | undefined>,
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
