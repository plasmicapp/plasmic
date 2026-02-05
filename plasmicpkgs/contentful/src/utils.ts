export const _uniq = <T>(xs: Array<T>): T[] => Array.from(new Set(xs));
export const BASE_URL = "https://cdn.contentful.com";

export function _ensure<T>(x: T | null | undefined, msg?: string): T {
  if (x === null || x === undefined) {
    throw new Error(msg ?? `Value must not be undefined or null`);
  } else {
    return x;
  }
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}
