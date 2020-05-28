import * as L from "lodash";

type StringGen = string | (() => string);

export function assert<T>(
  cond: T,
  msg: StringGen = "Assertion failed"
): asserts cond {
  if (!cond) {
    msg = L.isString(msg) ? msg : msg();
    debugger;
    throw new Error(msg);
  }
}

export function assertEq<T>(
    a: T,
    b: T,
    msg: StringGen = "Assertion failed"
  ) {
    if (a !== b) {
        console.log(a, b);
      msg = L.isString(msg) ? msg : msg();
      debugger;
      throw new Error(msg);
    }
  }

export const omitNils = <V>(x: {
  [k: string]: V | null | undefined;
}): { [k: string]: V } => L.pickBy(x, (x): x is V => x != null);

export const withoutNils = <T>(xs: Array<T | undefined | null>): T[] =>
  xs.filter((x): x is T => x != null);

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    throw new Error(`Value must not be undefined or null.`);
  } else {
    return x;
  }
}
