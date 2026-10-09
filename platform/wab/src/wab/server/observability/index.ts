import { importByPath } from "@/wab/server/util/import-by-path";
import { initObservability } from "@plasmic-shared/observability/node";
import path from "path";

const {
  logger,
  withSpan: withOtelSpan,
  withLogContext,
  initErrorReporting,
} = initObservability(
  "wab",
  process.env.NODE_ENV || "development",
  process.env,
);

export { initErrorReporting, logger, withLogContext };

/** Adds WAB operation logs and Prometheus timings to the shared span lifecycle. */
export async function withSpan<T>(
  name: string,
  f: () => Promise<T>,
  msg?: string,
) {
  const suffix = msg ? `: ${msg}` : "";

  const start = new Date().getTime();
  logger.debug(`span "${name}" started at ${start}${suffix}`);

  const { WabPromTimer }: typeof import("@/wab/server/promstats") =
    await importByPath(path.join(__dirname, "..", "promstats.ts"));
  const promTimer = new WabPromTimer(name);
  return withOtelSpan(name, async () => {
    try {
      const result = await f();
      logger.info(
        `span "${name}" finished in ${new Date().getTime() - start}ms${suffix}`,
      );
      return result;
    } catch (err) {
      logger.error(
        `span "${name}" failed in ${new Date().getTime() - start}ms${suffix}`,
      );
      throw err;
    } finally {
      promTimer.end();
    }
  });
}
