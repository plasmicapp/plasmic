/**
 * @deprecated Please use the version with a message for better debugging info
 * and bug tracking on Sentry
 */
export function assert<T>(cond: T): asserts cond;
/**
 * Asserts condition
 * @param cond
 * @param msg
 */
export function assert<T>(cond: T, msg: string): asserts cond;
/**
 * Asserts condition
 * @param cond
 * @param msg
 */
export function assert<T>(
  cond: T,
  msg: string = 'Assertion failed',
): asserts cond {
  if (!cond) {
    // We always generate an non empty message so that it doesn't get swallowed
    // by the async library.
    debugger;
    throw new Error(msg);
  }
}

export function mkUnexpectedTypeMsg(_types: Function[], _x: any) {
  return `Got unexpected type`;
}

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    throw new Error('Expected non-null or non-undefined value');
  }
  return x;
}

export function maybe<T, U>(
  x: T | undefined | null,
  f: (y: T) => U,
): U | undefined {
  if (x === undefined || x === null) return undefined;
  return f(x);
}

export function ensureArray<T>(xs: T | T[]): T[] {
  return Array.isArray(xs) ? xs : [xs];
}

export const tuple = <T extends any[]>(...args: T): T => args;

export function camelize(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}
