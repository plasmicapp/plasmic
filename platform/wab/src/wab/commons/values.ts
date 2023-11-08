import stringify from "fast-stringify";

export function valueAsString(x: any): string {
  if (x === null || x === undefined) {
    return "";
  }
  if (x instanceof Date) {
    return x.toISOString();
  } else if (typeof x === "string") {
    return x;
  } else {
    return stringify(x);
  }
}
