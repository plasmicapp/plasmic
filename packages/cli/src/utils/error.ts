import chalk from "chalk";
import { logger } from "../deps";
import { checkEngineStrict } from "./npm-utils";

/**
 * Represents an error that doesn't need to be forwarded to Sentry.
 * These are errors that are user-fault, for example:
 * - Using an old version of CLI
 */
export class HandledError extends Error {}

/**
 * Catches HandledErrors and just exits
 * Forwards all other errors along.
 * @param p
 * @returns
 */
export const handleError = <T>(p: Promise<T>) => {
  return p.catch((e) => {
    if (e.message) {
      logger.error(
        chalk.bold(chalk.redBright("\nPlasmic error: ")) + e.message
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
