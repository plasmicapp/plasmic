/**
 * Common client/server top-level error handling code should eventually live here.
 */

export const IGNORE_ERROR_KEY = "__plasmicIgnoreError";

/**
 * Marks an error as ignored. It will not be shown nor reported.
 *
 * This is for errors in Studio or in server that are considered out of our control.
 * Examples:
 * - Errors thrown by user code
 * - 403 errors from data sources
 */
export function stampIgnoreError<T = unknown>(error: T): T {
  if (typeof error === "object" && error) {
    error[IGNORE_ERROR_KEY] = true;
  }
  return error;
}

export function isStampedIgnoreError(error: unknown): boolean {
  if (typeof error === "object" && error) {
    return error[IGNORE_ERROR_KEY];
  } else {
    return false;
  }
}
