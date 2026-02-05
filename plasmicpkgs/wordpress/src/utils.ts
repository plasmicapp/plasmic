export const queryOperators = [
  {
    value: "search",
    label: "Search",
  },
  {
    value: "slug",
    label: "Filter by Slug",
  },
  {
    value: "author",
    label: "Filter by author",
  },
] as const;

export type QueryOperator = (typeof queryOperators)[number]["value"];

export function ensure<T>(x: T | null | undefined, message?: string): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(message ?? `Value must not be undefined or null`);
  } else {
    return x;
  }
}

export function cleanUrl(url: string): string {
  return url.replace(/\/$/, "");
}
