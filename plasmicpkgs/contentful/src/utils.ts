export const _uniq = <T>(xs: Array<T>): T[] => Array.from(new Set(xs));

export function _ensure<T>(x: T | null | undefined, msg?: string): T {
  if (x === null || x === undefined) {
    throw new Error(msg ?? `Value must not be undefined or null`);
  } else {
    return x;
  }
}
