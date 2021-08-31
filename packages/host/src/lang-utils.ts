function isString(x: any): x is string {
  return typeof x === "string";
}

type StringGen = string | (() => string);

export function ensure<T>(x: T | null | undefined, msg: StringGen = ""): T {
  if (x === null || x === undefined) {
    debugger;
    msg = (isString(msg) ? msg : msg()) || "";
    throw new Error(
      `Value must not be undefined or null${msg ? `- ${msg}` : ""}`
    );
  } else {
    return x;
  }
}
