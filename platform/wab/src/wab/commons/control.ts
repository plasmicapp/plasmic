import { hackyCast, spanLast } from "@/wab/shared/common";

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
  fn: (...args: Args) => Promise<Result>,
): (
  ...args: [
    ...args: Args,
    cb: (err: Error | undefined | null, result?: Result) => void,
  ]
) => void {
  return (
    ...args: [
      ...args: Args,
      cb: (err: Error | undefined | null, result?: Result) => void,
    ]
  ) => {
    const [realArgs, cb] = spanLast(args);
    fn(...hackyCast(realArgs)).then(
      (result) => cb(null, result),
      (reason) => cb(reason),
    );
  };
}
