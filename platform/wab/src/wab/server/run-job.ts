import { logger } from "@/wab/server/observability";
import "@/wab/server/observability/setup";
import { spawn } from "@/wab/shared/common";
import * as Sentry from "@sentry/node";

/**
 * Runs the main function of a job, e.g. a cronjob in devops/deployments.
 *
 * Reports errors to Sentry, and fails the job if `main` throws. Flushes Sentry
 * before the process exits, since a job exits as soon as `main` is done.
 */
export function runJob(name: string, main: () => Promise<void>) {
  spawn(_runJob(name, main));
}

async function _runJob(name: string, main: () => Promise<void>) {
  try {
    await main();
  } catch (error) {
    logger.error(`${name} failed`, {
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    Sentry.captureException(error);
    process.exitCode = 1;
  } finally {
    await Sentry.close(2000);
  }
}

export const _testonly = { runJob: _runJob };
