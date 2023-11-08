/* eslint-disable no-restricted-imports */
import * as React from "react";
import { useAsync, useAsyncFn } from "react-use";
import { AsyncFnReturn, AsyncState } from "react-use/lib/useAsync";
import { FnReturningPromise, PromiseType } from "react-use/lib/util";
import { handleError } from "../ErrorNotifications";
export type { AsyncFnReturn, AsyncState } from "react-use/lib/useAsync";
/* eslint-enable no-restricted-imports */

/**
 * This is a wrapper for react-use's useAsync that handles errors in the
 * async function more verbosely - displaying an error message and reporting
 * the error before returning it.
 */
export function useAsyncStrict<T extends FnReturningPromise>(
  fn: T,
  deps?: React.DependencyList
): AsyncState<PromiseType<ReturnType<T>>> {
  const state = useAsync(fn, deps);
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
