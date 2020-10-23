import L from "lodash";

type StringGen = string | (() => string);

export function flatMap<T, U>(arr: T[], f: (x: T) => U[]) {
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

export function ensureString(x: any) {
  if (L.isString(x)) {
    return x;
  } else {
    throw new Error(`Expected ${x} to be a string`);
  }
}
