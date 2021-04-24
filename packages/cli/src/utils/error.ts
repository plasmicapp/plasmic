import chalk from "chalk";

/**
 * Represents an error that doesn't need to be forwarded to Sentry.
 * These are errors that are user-fault, for example:
 * - Using an old version of CLI
 */
export class HandledError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

/**
 * Catches HandledErrors and just exits
 * Forwards all other errors along.
 * @param p
 * @returns
 */
export const handleError = <T>(p: Promise<T>) => {
  return p.catch((e) => {
    console.error(chalk.bold(chalk.redBright("\nPlasmic error: ")) + e.message);
    if (e instanceof HandledError) {
      // eslint-disable-next-line
      process.exit(1);
    } else {
      throw e;
    }
  });
};
