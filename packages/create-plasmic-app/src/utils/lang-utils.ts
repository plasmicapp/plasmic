/*eslint
@typescript-eslint/no-explicit-any: 0,
@typescript-eslint/explicit-module-boundary-types: 0,
no-debugger: 0,
*/
import L from "lodash";

type StringGen = string | (() => string);

export function flatMap<T, U>(arr: T[], f: (x: T) => U[]): U[] {
  const r: U[] = [];
  for (const x of arr) {
    r.push(...f(x));
  }
  return r;
}

export function ensure<T>(x: T | null | undefined, msg: StringGen = ""): T {
  if (x === null || x === undefined) {
    debugger;
    msg = (L.isString(msg) ? msg : msg()) || "";
    throw new Error(
      `Value must not be undefined or null${msg ? `- ${msg}` : ""}`
    );
  } else {
    return x;
  }
}

export function ensureString(x: any): string {
  if (L.isString(x)) {
    return x;
  } else {
    throw new Error(`Expected ${x} to be a string`);
  }
}

export class AssertionError extends Error {
  constructor(msg = "Assertion failed") {
    super(msg);
  }
}

export function assert<T>(
  cond: T,
  msg: StringGen = "Assertion failed"
): asserts cond {
  if (!cond) {
    // We always generate an non empty message so that it doesn't get swallowed
    // by the async library.
    msg = (L.isString(msg) ? msg : msg()) || "Assertion failed";
    debugger;
    throw new AssertionError(msg);
  }
}
