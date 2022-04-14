export function ensure<T>(x: T | null | undefined, msg = ""): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(
      `Value must not be undefined or null${msg ? `- ${msg}` : ""}`
    );
  } else {
    return x;
  }
}
