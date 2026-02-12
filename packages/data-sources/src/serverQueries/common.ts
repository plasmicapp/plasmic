import React from "react";

import {
  isPlasmicUndefinedDataErrorPromise,
  PlasmicUndefinedDataErrorPromise,
  tagPlasmicUndefinedDataErrorPromise,
  untagPlasmicUndefinedDataErrorPromise,
} from "../common";

import { mapRecords, noopFn } from "../utils";
import { PlasmicQueryResult } from "./types";

/**
 * Creates a $queries variable that can be used before queries are completed.
 *
 * Each query gets a StatefulQueryResult which implements PlasmicQueryResult.
 * If data is attempted to be accessed before query completion,
 * PlasmicUndefinedDataErrorPromise is thrown. Dependent queries can catch this
 * and delay its own execution until the dependent data is ready.
 *
 * When a query execution completes, the StatefulQueryResult must be notified
 * via resolvePromise or rejectPromise.
 */
export function createDollarQueries<QueryName extends string>(
  queryNames: QueryName[]
): Record<QueryName, PlasmicQueryResult> {
  return Object.fromEntries(
    queryNames.map((queryName: QueryName) => {
      return [queryName, new StatefulQueryResult()];
    })
  ) as Record<QueryName, StatefulQueryResult>;
}

export type StatefulQueryState<T = unknown> =
  | {
      state: "initial";
      key: null;
    }
  | {
      state: "loading";
      key: string;
    }
  | {
      state: "done";
      key: string;
      data: T;
    }
  | {
      state: "done";
      key: string | null;
      error: unknown;
    };

export type StateListener<T = unknown> = (
  state: StatefulQueryState<T>,
  prevState: StatefulQueryState<T>
) => void;

export class StatefulQueryResult<T = unknown> implements PlasmicQueryResult<T> {
  current: StatefulQueryState<T>;
  settable: SettablePromise<T>;
  private readonly listeners: Set<StateListener<T>> = new Set();

  constructor() {
    this.current = { state: "initial", key: null };
    this.settable = new SettablePromise();
    tagPlasmicUndefinedDataErrorPromise(this.settable.promise);
  }

  private transitionState(next: StatefulQueryState<T>): void {
    const prev = this.current;
    if (
      prev.state === next.state &&
      prev.key === next.key &&
      ("data" in prev ? prev.data : undefined) ===
        ("data" in next ? next.data : undefined) &&
      ("error" in prev ? prev.error : undefined) ===
        ("error" in next ? next.error : undefined)
    ) {
      return;
    }

    // Create a new SettablePromise when...
    if (
      prev.key !== null && // the promise was already bound to a key AND
      // NOT the loading -> done transition with the same key
      !(
        prev.key === next.key &&
        prev.state === "loading" &&
        next.state === "done"
      )
    ) {
      this.settable = new SettablePromise();
      tagPlasmicUndefinedDataErrorPromise(this.settable.promise);
    }

    this.current = next;
    this.notifyListeners(prev);
  }

  addListener(listener: StateListener<T>): void {
    this.listeners.add(listener);
  }

  removeListener(listener: StateListener<T>): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(prev: StatefulQueryState<T>): void {
    for (const listener of this.listeners) {
      listener(this.current, prev);
    }
  }

  reset(): void {
    this.transitionState({
      state: "initial",
      key: null,
    });
  }

  loadingPromise(key: string, promise: Promise<T>): void {
    this.transitionState({
      state: "loading",
      key,
    });

    promise.then(
      (value) => this.resolvePromise(key, value),
      (err) => this.rejectPromise(key, err)
    );
  }

  /**
   * Resolve is allowed if:
   * 1) no key / state is initial, which means we are resolving from cache
   * 2) key / state is loading, which means we need to check the keys match
   */
  resolvePromise(key: string, data: T): void {
    if (this.current.key === null || this.current.key === key) {
      this.transitionState({
        state: "done",
        key,
        data,
      });

      this.settable.resolve(data);
      untagPlasmicUndefinedDataErrorPromise(this.settable.promise);
    }
  }

  /**
   * Reject is allowed if:
   * 1) no key / state is initial, which means params resolution failed
   * 2) key / state is loading, which means we need to check the keys match
   */
  rejectPromise(key: string | null, error: unknown): void {
    if (this.current.key === null || this.current.key === key) {
      this.transitionState({
        state: "done",
        key,
        error,
      });

      // Avoid PromiseRejectionHandledWarning on internal promise
      // that users can't catch.
      this.settable.promise.catch(noopFn);
      this.settable.reject(error);
      untagPlasmicUndefinedDataErrorPromise(this.settable.promise);
    }
  }

  get key() {
    return this.current.key;
  }

  get data() {
    if (this.current.state === "done") {
      if ("data" in this.current) {
        return this.current.data;
      } else {
        throw this.current.error;
      }
    } else {
      throw this.settable.promise;
    }
  }

  get isLoading() {
    return this.current.state === "initial" || this.current.state === "loading";
  }

  async getDoneResult(): Promise<
    PlasmicQueryResult<T> & { current: { state: "done" } }
  > {
    await this.settable.promise;
    // If promise resolves, then the key must be set.
    return this as PlasmicQueryResult<T> & { current: { state: "done" } };
  }
}

/** Execute a function, forcing you to handle undefined and error cases. */
export function safeExec<T>(
  tryData: () => T,
  ifUndefined: (promise: PlasmicUndefinedDataErrorPromise) => T,
  ifError: (err: unknown) => T
): T {
  try {
    return tryData();
  } catch (err) {
    if (isPlasmicUndefinedDataErrorPromise(err)) {
      return ifUndefined(err);
    } else {
      return ifError(err);
    }
  }
}

export type ResolveParamsResult<Params extends unknown[] = unknown[]> =
  | { status: "ready"; resolvedParams: Params }
  | { status: "blocked"; promise: PlasmicUndefinedDataErrorPromise }
  | { status: "error"; error: Error };

/**
 * Resolves params, returning a result with the following possible states:
 * - "ready" if the evaluated params are available.
 * - "blocked" if we encounter a PlasmicUndefinedServerError promise
 *     and need to wait for it to resolve before trying to evaluate params again
 * - "error" if we encounter any other error
 */
export function resolveParams<F extends (...args: any[]) => any>(
  params: () => Parameters<F>
): ResolveParamsResult<Parameters<F>> {
  return safeExec<ResolveParamsResult<Parameters<F>>>(
    () => ({
      status: "ready",
      resolvedParams: params(),
    }),
    (promise) => ({
      status: "blocked",
      promise,
    }),
    (err) => ({
      status: "error",
      error: new Error("Error resolving function params", { cause: err }),
    })
  );
}

/**
 * Wraps each PlasmicQueryResult so that they return a hardcoded string for
 * undefined/loading and error cases.
 */
export function wrapDollarQueriesForMetadata<
  T extends Record<string, PlasmicQueryResult>
>(
  $queries: T,
  ifUndefined?: (promise: PlasmicUndefinedDataErrorPromise) => unknown,
  ifError?: (err: unknown) => unknown
): T {
  return wrapDollarQueriesWithFallbacks(
    $queries,
    ifUndefined ?? (() => "…"),
    ifError ?? (() => "[ERROR]")
  );
}

/**
 * Wraps each PlasmicQueryResult with a FallbackQueryResult to allow
 * setting fallbacks for undefined/loading and error cases.
 */
export function wrapDollarQueriesWithFallbacks<
  T extends Record<string, PlasmicQueryResult>
>(
  $queries: T,
  ifUndefined: (promise: PlasmicUndefinedDataErrorPromise) => unknown,
  ifError: (err: unknown) => unknown
): T {
  return mapRecords(
    (_queryName, $query): PlasmicQueryResult =>
      new FallbackQueryResult($query, ifUndefined, ifError),
    $queries
  ) as T;
}

class FallbackQueryResult<T = unknown> implements PlasmicQueryResult<T> {
  constructor(
    private readonly $query: PlasmicQueryResult,
    private readonly ifUndefined: (
      promise: PlasmicUndefinedDataErrorPromise
    ) => T,
    private readonly ifError: (err: unknown) => T
  ) {}

  get key() {
    return this.$query.key;
  }

  get data() {
    return safeExec(
      () => this.$query.data as T,
      (promise) => createConstantProxy(this.ifUndefined(promise)),
      (err) => createConstantProxy(this.ifError(err))
    );
  }

  get isLoading() {
    return this.$query.isLoading;
  }
}

function createConstantProxy(constant: unknown): any {
  const constantProxy: any = new Proxy<any>(
    {},
    {
      get(_target, prop) {
        return prop === Symbol.toPrimitive ? () => constant : constantProxy;
      },
    }
  );
  return constantProxy;
}

type Result<T> = Resolved<T> | Rejected;

interface Resolved<T> {
  state: "resolved";
  value: T;
}

interface Rejected {
  state: "rejected";
  error: unknown;
}

/** Wraps a Promise so its result can be checked synchronously. */
export class SyncPromise<T> {
  result: Result<T> | undefined = undefined;

  constructor(readonly promise: Promise<T>) {
    promise.then(
      (value) => {
        this.result = {
          state: "resolved",
          value,
        };
      },
      (error) => {
        this.result = {
          state: "rejected",
          error,
        };
      }
    );
  }
}

/**
 * Wraps a Promise so that it can be easily resolved/rejected
 * outside the executor param of the Promise constructor.
 */
class SettablePromise<T> {
  readonly promise: Promise<T>;
  // @ts-expect-error set in Promise constructor callback
  private _resolve: (value: T) => void;
  // @ts-expect-error set in Promise constructor callback
  private _reject: (error: unknown) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  resolve(value: T): void {
    this._resolve(value);
  }

  reject(error: unknown): void {
    this._reject(error);
  }
}

type EffectCallback<Deps extends EffectCallbackDeps> = (
  prevDeps: { [K in keyof Deps]: Deps[K] } | undefined
) => void | (() => void);
type EffectCallbackDeps = readonly unknown[];

/**
 * Like useEffect, but executes during the render phase instead of after commit.
 *
 * The effect runs synchronously during render when dependencies change.
 * Cleanup functions are called before the next effect runs or when deps change.
 *
 * The effect receives the previous dependency values (or undefined on first run),
 * allowing it to compare and decide whether to perform its logic.
 *
 * Note: Since this runs during render, the effect should not cause side effects
 * that would be problematic if React discards the render (e.g., in concurrent mode).
 */
export function useRenderEffect<const Deps extends EffectCallbackDeps>(
  effect: EffectCallback<Deps>,
  deps: Deps
): void {
  const ref = React.useRef<{
    deps: Deps | undefined;
    cleanup: (() => void) | void;
  }>({ deps: undefined, cleanup: undefined });

  const depsChanged =
    ref.current.deps === undefined ||
    deps.length !== ref.current.deps.length ||
    deps.some((dep, i) => !Object.is(dep, ref.current.deps![i]));

  if (depsChanged) {
    if (ref.current.cleanup) {
      ref.current.cleanup();
    }

    const prevDeps = ref.current.deps;
    ref.current.cleanup = effect(prevDeps);
    ref.current.deps = deps;
  }

  React.useEffect(() => {
    return () => {
      if (ref.current.cleanup) {
        ref.current.cleanup();
      }
    };
  }, []);
}
