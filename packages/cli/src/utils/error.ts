import type { Event, EventHint } from "@sentry/node";
import chalk from "chalk";
import { logger } from "../deps";
import { checkEngineStrict } from "./npm-utils";

/**
 * Represents an error that doesn't need to be forwarded to Sentry.
 * These are errors that are user-fault, for example:
 * - Using an old version of CLI
 */
export class HandledError extends Error {
  name = "HandledError";
}

export function sentryBeforeSend(event: Event, hint?: EventHint) {
  const original = hint?.originalException as any;
  if (
    original instanceof HandledError ||
    // stdout closed by parent process
    original?.code === "EPIPE" ||
    // Sentry <10 sets originalException to the promise for unhandled rejections.
    // TODO: remove when upgrading to Sentry 10+
    event.exception?.values?.some((v) => v.type === "HandledError")
  ) {
    return null;
  }
  return event;
}

/**
 * Catches HandledErrors and just exits
 * Forwards all other errors along.
 * @param p
 * @returns
 */
export const handleError = <T>(p: Promise<T>) => {
  return p.catch((e: Error) => {
    if (e.message) {
      logger.error(
        chalk.bold(chalk.redBright("\nPlasmic error: ")) + e.message + e.stack,
      );
    }
    // Check if we satisfy the engine policy first
    if (checkEngineStrict()) {
      // eslint-disable-next-line
      process.exit(1);
    } else if (e instanceof HandledError) {
      // eslint-disable-next-line
      process.exit(1);
    } else {
      throw e;
    }
  });
};
