import { logger } from "@/wab/server/observability";
import { WabPromTimer } from "@/wab/server/promstats";
import { trace } from "@opentelemetry/api";

export async function withSpan<T>(
  name: string,
  f: () => Promise<T>,
  msg?: string
) {
  const start = new Date().getTime();
  const promTimer = new WabPromTimer(name);
  const tracer = trace.getTracer("app");
  return tracer.startActiveSpan(name, async (span) => {
    try {
      return await f();
    } finally {
      const suffix = msg ? `: ${msg}` : "";
      logger().info(`${name} took ${new Date().getTime() - start}ms${suffix}`);
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
