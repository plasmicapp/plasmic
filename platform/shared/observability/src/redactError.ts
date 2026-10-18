import type { Properties } from "./Properties";

/** Log errors as data, excluding request/config objects that may contain credentials. */
export function redactError(
  err: Error,
  seen = new Set<Error>(),
): Properties | string {
  if (seen.has(err)) {
    return "[Circular]";
  }
  seen.add(err);
  const fields = Object.fromEntries(
    Object.entries(err).filter(
      ([key, value]) =>
        key !== "cause" && (key === "details" || isPrimitive(value)),
    ),
  );
  const cause = err.cause;
  return {
    ...fields,
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...(cause instanceof Error
      ? { cause: redactError(cause, seen) }
      : isPrimitive(cause) && cause !== undefined
        ? { cause }
        : {}),
  };
}

function isPrimitive(value: unknown) {
  return (
    value === null || (typeof value !== "object" && typeof value !== "function")
  );
}
