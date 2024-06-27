import { hackyCast, spanLast } from "@/wab/shared/common";
import {
  failableAsync,
  FailableAsyncArg,
  FailablePromise,
  failure as Failure,
  IFailable,
  success as Success,
} from "ts-failable";

export const coalesceErrorsAsync = <R, E, Err = Error>(
  p: () => FailablePromise<R, E>
) =>
  failableAsync<R, E | Err>(async ({ failure }) => {
    try {
      return await p();
    } catch (err) {
      return failure(err);
    }
  });

export async function sealedFailableAsync<R, E, Err = Error>(
  f: FailableAsyncArg<R, E>
) {
  return await coalesceErrorsAsync<R, E, Err>(() => failableAsync<R, E>(f));
}

export const liftErrorsAsync = <R, Err = Error>(p: () => Promise<R>) =>
  failableAsync<R, Err>(async ({ success, failure }) => {
    try {
      return success(await p());
    } catch (err) {
      return failure(err);
    }
  });

export interface WriteablePromise<T, Err = Error> {
  promise: Promise<T>;
  result?: IFailable<T, Err>;
}

export type ReadablePromise<T, Err = Error> = Readonly<
  WriteablePromise<T, Err>
>;

/**
 * Turns a Promise into a ReadablePromise, which is a promise paired with its
 * resulting value or error (synchronously readable).
 *
 * Plays well with PLazy (will only lazily trigger the PLazy).
 */
export function asReadablePromise<T, Err = Error>(
  promise: Promise<T>
): ReadablePromise<T, Err> {
  const rp: WriteablePromise<T, Err> = {
    promise: promise.then(
      (value) => {
        rp.result = Success<T, Err>(value);
        return value;
      },
      (error) => {
        rp.result = Failure<T, Err>(error);
        throw error;
      }
    ),
    result: undefined,
  };
  return rp;
}

export function nonReentrant<T extends Array<any>, U>(
  fn: (...args: T) => U,
  keyfn: (...args: T) => any = () => null
): (...args: T) => U {
  const entered = new Map<string, boolean>();
  return (...args: T): U => {
    const key = JSON.stringify(keyfn(...args));
    if (entered.get(key)) {
      throw new Error(`Re-entered non-reentrant function ${fn.name}`);
    }
    entered.set(key, true);
    try {
      return fn(...args);
    } finally {
      entered.set(key, false);
    }
  };
}

export function nonReentrantAsync<T extends Array<any>, U>(
  fn: (...args: T) => Promise<U>,
  keyfn: (...args: T) => any = () => null
): (...args: T) => Promise<U> {
  const entered = new Map<string, boolean>();
  return async (...args: T): Promise<U> => {
    const key = JSON.stringify(keyfn(...args));
    if (entered.get(key)) {
      throw new Error(`Re-entered non-reentrant function ${fn.name}`);
    }
    entered.set(key, true);
    try {
      return await fn(...args);
    } finally {
      entered.set(key, false);
    }
  };
}

/**
 * Wrap a Promise based async function as a node style callback function.
 *
 * For instance, node-async behaves differently if you pass it a Function vs
 * AsyncFunction, and transpilers like babel vs sucrase differ on whether they
 * transpile AsyncFunctions into Functions. callbackify() can be used to convert
 * a promise to a function, but it still returns an AsyncFunction, so the library
 * doesn't pass it a callback. And even wrapping that in another layer of function
 * still results in different semantics/timing--it doesn't immediately start
 * executing the function. So this utility lets you always ensure it behaves
 * consistently and correctly, together with callbackify.
 */
export function safeCallbackify<Args extends any[], Result>(
  fn: (...args: Args) => Promise<Result>
): (
  ...args: [
    ...args: Args,
    cb: (err: Error | undefined | null, result?: Result) => void
  ]
) => void {
  return (
    ...args: [
      ...args: Args,
      cb: (err: Error | undefined | null, result?: Result) => void
    ]
  ) => {
    const [realArgs, cb] = spanLast(args);
    fn(...hackyCast(realArgs)).then(
      (result) => cb(null, result),
      (reason) => cb(reason)
    );
  };
}

export function warnFalsy<T>(x: T, label: string): T {
  if (!x) {
    console.warn("Unexpected falsy value: " + label);
  }
  return x;
}
