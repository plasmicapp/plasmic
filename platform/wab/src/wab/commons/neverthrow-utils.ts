import { AssertionError } from "@/wab/shared/common";
import { formatErrorMessage } from "@/wab/shared/error-handling";
import { Result } from "neverthrow";

/**
 * Returns the Ok value, or throws the Err error.
 *
 * @deprecated Use {@link ensureOk} where possible: it throws an
 * AssertionError with a readable message
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.isErr()) {
    throw result.error;
  } else {
    return result.value;
  }
}

/**
 * Asserts the result is Ok and returns its value.
 *
 * Similar to unwrap but the AssertionError makes that intent explicit at the throw
 * that it's not an expected failure a caller could react to but an invariant violation.
 */
export function ensureOk<T, E>(result: Result<T, E>): T {
  if (result.isErr()) {
    throw new AssertionError(
      `Expected Ok result, but got Err: ${formatErrorMessage(result.error)}`
    );
  }
  return result.value;
}

/**
 * Asserts the result is Err and returns its error. Counterpart of
 * {@link ensureOk}.
 */
export function ensureErr<T, E>(result: Result<T, E>): E {
  if (result.isOk()) {
    throw new AssertionError(
      `Expected Err result, but got Ok: ${formatErrorMessage(result.value)}`
    );
  }
  return result.error;
}
