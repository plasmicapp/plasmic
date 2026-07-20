import { Result } from "neverthrow";

/** Returns the Ok value, or throws the Err error. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.isErr()) {
    throw result.error;
  } else {
    return result.value;
  }
}
