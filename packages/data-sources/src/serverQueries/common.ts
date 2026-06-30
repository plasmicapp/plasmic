import React from "react";
import {
  isPlasmicUndefinedDataErrorPromise,
  PlasmicUndefinedDataErrorPromise,
  tagPlasmicUndefinedDataErrorPromise,
  untagPlasmicUndefinedDataErrorPromise,
} from "../common";
import { mapRecords, noopFn } from "../utils";
import { makeQueryCacheKey } from "./makeQueryCacheKey";
import { $StateSpec, PlasmicQueryResult, QueryExecutionContext } from "./types";

/**
 * @internal
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

/** @internal */
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

/** @internal */
export type StateListener<T = unknown> = (
  state: StatefulQueryState<T>,
  prevState: StatefulQueryState<T>
) => void;

/** @internal */
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

  toJSON() {
    // Serialize only the state, not promise nor listeners
    return this.current;
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
  const result = safeExecResult(tryData);
  if ("promise" in result) {
    return ifUndefined(result.promise);
  } else if ("error" in result) {
    return ifError(result.error);
  } else {
    return result.data;
  }
}

/** Execute a function, returning a result-like type. */
export function safeExecResult<T>(tryData: () => T):
  | {
      data: T;
    }
  | {
      promise: PlasmicUndefinedDataErrorPromise;
    }
  | {
      error: unknown;
    } {
  try {
    return { data: tryData() };
  } catch (err) {
    if (isPlasmicUndefinedDataErrorPromise(err)) {
      return { promise: err };
    } else {
      return { error: err };
    }
  }
}

export function assertUnexpectedNodeType(x: never): never {
  throw new Error(`Unexpected node type: ${x}`);
}

export type ResolveParamsResult<Params extends unknown[] = unknown[]> =
  | { status: "ready"; resolvedParams: Params; cacheKey: string }
  | { status: "blocked"; promise: PlasmicUndefinedDataErrorPromise }
  | { status: "error"; error: Error };

/**
 * Resolves params, returning a result with the following possible states:
 * - "ready" if the evaluated params are available.
 * - "blocked" if we encounter a PlasmicUndefinedDataErrorPromise
 *     and need to wait for it to resolve before trying to evaluate params again
 * - "error" if we encounter any other error
 */
export function resolveParams<F extends (...args: any[]) => any>(
  queryId: string,
  params: () => Parameters<F>
): ResolveParamsResult<Parameters<F>> {
  return safeExec<ResolveParamsResult<Parameters<F>>>(
    () => {
      const resolvedParams = params();
      const cacheKey = makeQueryCacheKey(queryId, resolvedParams);
      return {
        status: "ready",
        resolvedParams,
        cacheKey,
      };
    },
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
 * @internal
 * Wraps each PlasmicQueryResult so that they return a hardcoded string for
 * undefined/loading and error cases.
 */
export function wrapPlasmicQueriesForMetadata<
  T extends Record<string, PlasmicQueryResult>
>(
  queries: T,
  ifUndefined?: (promise: PlasmicUndefinedDataErrorPromise) => unknown,
  ifError?: (err: unknown) => unknown
): T {
  return wrapPlasmicQueriesWithFallbacks(
    queries,
    ifUndefined ?? (() => "…"),
    ifError ?? (() => "[ERROR]")
  );
}

/**
 * Wraps each PlasmicQueryResult with a FallbackQueryResult to allow
 * setting fallbacks for undefined/loading and error cases.
 */
export function wrapPlasmicQueriesWithFallbacks<
  T extends Record<string, PlasmicQueryResult>
>(
  queries: T,
  ifUndefined: (promise: PlasmicUndefinedDataErrorPromise) => unknown,
  ifError: (err: unknown) => unknown
): T {
  return mapRecords(
    (_queryName, $query): PlasmicQueryResult =>
      new FallbackQueryResult($query, ifUndefined, ifError),
    queries
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
  private _resolve!: (value: T) => void;
  private _reject!: (error: unknown) => void;

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

/** Returns the value passed on the previous render, or undefined on the first. */
export function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T | undefined>(undefined);
  const prev = ref.current;
  ref.current = value;
  return prev;
}

/**
 * Creates a $state object that only contains initial values.
 *
 * Initial values with dynamic expressions have initFunc, which is
 * lazily-evaluated as a getter function.
 */
export function createInitial$State(
  $ctx: QueryExecutionContext["$ctx"],
  $props: QueryExecutionContext["$props"],
  $q: QueryExecutionContext["$q"],
  stateSpecs: $StateSpec[]
): Record<string, any> {
  const root: Record<string, any> = {};

  for (const stateSpec of stateSpecs) {
    if (stateSpec.path.includes("[]")) {
      continue;
    }

    // Parse path to find parent and leaf
    const parts = stateSpec.path.split(".");
    const parentPath = parts.slice(0, parts.length - 1);
    const leaf = parts[parts.length - 1];

    // Find parent of leaf
    let parent = root;
    for (const part of parentPath) {
      if (!(part in parent)) {
        parent[part] = {};
      }
      parent = parent[part] as Record<string, unknown>;
    }

    // Set initial value or getter function for initial value
    if (stateSpec.valueProp) {
      parent[leaf] = $props[stateSpec.valueProp];
    } else if ("initVal" in stateSpec) {
      parent[leaf] = stateSpec.initVal;
    } else if (stateSpec.initFunc) {
      const initFunc = stateSpec.initFunc;
      // Cache successes, which should never change on the initial render.
      let cached: { value: unknown } | undefined;
      Object.defineProperty(parent, leaf, {
        get: () => {
          if (cached) {
            return cached.value;
          }
          const value = initFunc({
            $ctx,
            $props,
            $q,
            $state: root,
            $refs: {},
            $queries: {},
          });
          cached = { value };
          return value;
        },
        enumerable: true,
        configurable: true,
      });
    }
  }

  return root;
}
