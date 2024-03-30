import { handleError } from "@/wab/client/ErrorNotifications";
import * as React from "react";

/* eslint-disable no-restricted-imports */
import { useAsyncFn, useAsyncRetry } from "react-use";
import { AsyncFnReturn } from "react-use/lib/useAsync";
import { AsyncStateRetry as AsyncState } from "react-use/lib/useAsyncRetry";
import { FnReturningPromise, PromiseType } from "react-use/lib/util";
export type { AsyncFnReturn } from "react-use/lib/useAsync";
export type { AsyncStateRetry as AsyncState } from "react-use/lib/useAsyncRetry";
/* eslint-enable no-restricted-imports */

/**
 * This is a wrapper for react-use's useAsyncRetry that handles errors in the
 * async function more verbosely - displaying an error message and reporting
 * the error before returning it.
 *
 * This actually uses useAsyncRetry to add the retry functionality
 * for force reloading the async function.
 */
export function useAsyncStrict<T extends FnReturningPromise>(
  fn: T,
  deps?: React.DependencyList
): AsyncState<PromiseType<ReturnType<T>>> {
  const state = useAsyncRetry(fn, deps);
  React.useEffect(() => {
    if (state.error) {
      handleError(state.error);
    }
  }, [state.error]);
  return state;
}

/**
 * This is a wrapper for react-use's useAsyncFn that handles errors in the
 * async function more verbosely - displaying an error message and reporting
 * the error before returning it.
 */
export function useAsyncFnStrict<T extends FnReturningPromise>(
  fn: T,
  deps?: React.DependencyList,
  initialState?: AsyncState<PromiseType<ReturnType<T>>>
): AsyncFnReturn<T> {
  const [state, fetch] = useAsyncFn(fn, deps, initialState);
  React.useEffect(() => {
    if (state.error) {
      handleError(state.error);
    }
  }, [state.error]);
  return [state, fetch];
}
