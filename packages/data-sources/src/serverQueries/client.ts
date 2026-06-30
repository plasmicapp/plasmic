import {
  SWRResponse,
  useMutablePlasmicQueryData,
  usePlasmicDataConfig,
  wrapLoadingFetcher,
} from "@plasmicapp/query";
import * as React from "react";
import { mapRecordEntries, mapRecords, noopFn, notNil } from "../utils";
import {
  ResolveParamsResult,
  StatefulQueryResult,
  SyncPromise,
  createDollarQueries,
  createInitial$State,
  resolveParams,
  usePrevious,
} from "./common";
import { makeQueryCacheKey } from "./makeQueryCacheKey";
import {
  PlasmicQuery,
  PlasmicQueryResult,
  QueryComponentNode,
  QueryExecutionContext,
} from "./types";

const GLOBAL_CACHE = new Map<string, SyncPromise<unknown>>();

/**
 * Initial context just before execution.
 * @internal
 */
type ClientQueryExecutionContext = Pick<
  QueryExecutionContext,
  "$ctx" | "$props"
> & {
  $state: QueryExecutionContext["$state"] | null;
};

/**
 * @internal
 * This hook's job is to execute queries and re-render when query state changes.
 * Data caching can be controlled via @plasmicapp/query.
 *
 * The actual results will be available in the returned $queries object.
 *
 * Prefetched query data can be passed to
 * <PlasmicQueryDataProvider prefetchedCache={...}>.
 *
 * Example codegen:
 *
 * export const queryTree = {
 *   type: "component",
 *   queries: {
 *     films: { fn: $$.fetch, id: "fetch", args: ({ $q, $props, $ctx }) => [...] }
 *   },
 *   propsContext: {},
 * };
 *
 * export function ClientComponent($props, $ctx) {
 *   const $q = usePlasmicQueries(queryTree, { $ctx, $props, $state: null });
 *   return <div>{$q.films.data}</div>
 * }
 */
export function usePlasmicQueries(
  tree: QueryComponentNode,
  env: ClientQueryExecutionContext
): Record<string, PlasmicQueryResult> {
  const { $ctx, $props } = env;
  // Since we codegen components with data fetching and content rendering
  // together, the component will be suspended when query data is not loaded.
  // Therefore, this hook's primary complexity is handling component suspension
  // while maintaining compatibility with @plasmicapp/query (SWR).
  //
  // Due to component suspension, normal useEffects are not run, so we cannot
  // rely on useMutablePlasmicQueryData to start queries.
  // Instead, we start all queries during the render phase to ensure whichever
  // thrown promise that causes suspense will settle.
  // To ensure we don't start the same query in the render phase and in SWR,
  // we wrap the query functions with logic to check/store promises in the
  // GLOBAL_CACHE, which will contain all promises started outside SWR.
  // After SWR stores the results of these promises in its own cache,
  // we remove the promise from the GLOBAL_CACHE and rely on SWR,
  // since SWR is responsible for other behaviors like revalidation.

  // Wrap queries with the GLOBAL_CACHE.
  const wrappedQueries = React.useMemo(() => wrapQueries(tree.queries), [tree]);

  const $queries = React.useMemo(
    () => createDollarQueries(Object.keys(tree.queries)),
    [tree]
  );
  const $queryStates = $queries as Record<string, StatefulQueryResult>;

  // $state should be null on the first render only since useDollarState
  // is run AFTER usePlasmicQueries. This gives usePlasmicQueries the chance
  // to resolve query/state interdependencies on the first render via
  // createInitial$State, which lazily evaluates initial state values.
  let $state = env.$state;
  if (!$state) {
    $state = createInitial$State($ctx, $props, $queryStates, tree.stateSpecs);
  }

  const { fallback: prefetchedCache, cache: swrCache } = usePlasmicDataConfig();

  // Holds the latest resolved params per query for this render.
  // Used later by usePlasmicQuery.
  const paramsResults: Record<string, ResolveParamsResult> = {};

  // Execution context changes every render, don't bother memo-ing this.
  // Our memoization will be based on the resolved params cache key instead.
  const executionCtx: QueryExecutionContext = {
    $ctx,
    $props,
    $q: $queryStates,
    $state,
  };

  // Check if params resolve consistently with $queryStates.
  // If the queries changed, or any params don't resolve consistently,
  // then reset all queries to "initial" to ensure we don't show stale data.
  // The invariant after this block of code is that all $queryStates in
  // "loading" or "done" states are in paramsResults.
  // $queryStates in "initial" state will be resolved in initPlasmicQueriesSync.
  const prevWrappedQueries = usePrevious(wrappedQueries);
  let consistent =
    prevWrappedQueries === undefined ||
    Object.is(prevWrappedQueries, wrappedQueries);
  mapRecords(
    (queryName, $query, query) => {
      if (!consistent || $query.current.state === "initial") {
        return;
      }

      const paramsResult = resolveParams(query.id, () =>
        query.args(executionCtx)
      );
      paramsResults[queryName] = paramsResult;

      if (paramsResult.status === "blocked") {
        consistent = false;
      } else if (
        paramsResult.status === "error" &&
        $query.current.key !== null
      ) {
        consistent = false;
      } else if (
        paramsResult.status === "ready" &&
        paramsResult.cacheKey !== $query.current.key
      ) {
        consistent = false;
      }
    },
    $queryStates,
    wrappedQueries
  );
  if (!consistent) {
    mapRecords((_queryName, $query) => {
      $query.reset();
    }, $queryStates);
    for (const k of Object.keys(paramsResults)) {
      delete paramsResults[k];
    }
  }

  // Core loop that starts queries outside SWR and checks caches.
  // Stop when a new render starts or the component unmounts.
  const stopRef = React.useRef<() => void>();
  stopRef.current?.();
  let stopped = false;
  const stop = new Promise<void>((resolve) => {
    stopRef.current = () => {
      stopped = true;
      resolve();
    };
  });
  React.useEffect(() => () => stopRef.current?.(), []);
  const loop = async () => {
    while (true) {
      initPlasmicQueriesSync(
        $queryStates,
        wrappedQueries,
        paramsResults,
        executionCtx,
        prefetchedCache,
        swrCache
      );

      const loadingQueries = mapRecordEntries((_queryName, $query) => {
        if ($query.isLoading) {
          return $query.getDoneResult();
        } else {
          return null;
        }
      }, $queryStates).filter(notNil);

      if (loadingQueries.length === 0) {
        break;
      }

      await Promise.race([stop, ...loadingQueries]);
      if (stopped) {
        break;
      }
    }
  };

  loop()
    // Avoid PromiseRejectionHandledWarning on internal promise that users can't catch.
    .catch(noopFn);

  mapRecords(
    (queryName, $query, query) => {
      usePlasmicQuery($query, query, paramsResults[queryName]);
    },
    $queryStates,
    wrappedQueries
  );

  return $queries;
}

/**
 * Wraps queries with the following logic:
 * - Check GLOBAL_CACHE.
 * - Count number of queries loading globally.
 */
function wrapQueries(
  queries: Record<string, PlasmicQuery>
): Record<string, PlasmicQuery> {
  return mapRecords((_queryName, query: PlasmicQuery) => {
    const wrappedFn = (...args: unknown[]): Promise<unknown> => {
      // Check GLOBAL_CACHE.
      const cacheKey = makeQueryCacheKey(query.id, args);
      const cached = GLOBAL_CACHE.get(cacheKey);
      if (cached) {
        return cached.promise;
      }

      // Count number of queries loading globally.
      const promise = wrapLoadingFetcher(query.fn)(...args);

      GLOBAL_CACHE.set(cacheKey, new SyncPromise(promise));
      return promise;
    };
    return {
      id: query.id,
      fn: wrappedFn,
      args: query.args,
    };
  }, queries);
}

/**
 * Synchronously resolves params and resolves from cache or starts loading.
 * This function does as much as possible without awaiting any promises.
 *
 * Resolved params will be assigned to paramsResults.
 */
function initPlasmicQueriesSync(
  $queries: Record<string, StatefulQueryResult>,
  queries: Record<string, PlasmicQuery>,
  paramsResults: Record<string, ResolveParamsResult>,
  executionCtx: QueryExecutionContext,
  prefetchedCache: { [k: string]: unknown },
  clientCache: { get: (k: string) => unknown }
): void {
  // Since we don't know the exact order of the dependency graph of queries,
  // we continuously iterate over the queries if any queries were cached from
  // the last iteration.
  let anySettled: boolean;
  do {
    anySettled = false;

    mapRecords(
      (queryName, $query, query) => {
        if ($query.current.state !== "initial") {
          return;
        }

        const paramsResult = resolveParams(query.id, () =>
          query.args(executionCtx)
        );
        paramsResults[queryName] = paramsResult;

        if (paramsResult.status === "error") {
          // params errored, reject and don't try again next iteration
          $query.rejectPromise(null, paramsResult.error);
          anySettled = true;
          return;
        } else if (paramsResult.status === "blocked") {
          // params blocked, try again next iteration if any resolved
          return;
        } // else paramsResult.status === "ready"

        const cacheKey = makeQueryCacheKey(
          query.id,
          paramsResult.resolvedParams
        );

        // Try prefetched cache
        if (cacheKey in prefetchedCache) {
          $query.resolvePromise(cacheKey, prefetchedCache[cacheKey]);
          anySettled = true;
          return;
        }

        // Try SWR cache
        const clientCacheData = clientCache.get(cacheKey);
        if (clientCacheData !== undefined) {
          $query.resolvePromise(cacheKey, clientCacheData);
          anySettled = true;
          return;
        }

        // Try global cache
        const clientCachedPromise = GLOBAL_CACHE.get(cacheKey);
        if (clientCachedPromise?.result) {
          if (clientCachedPromise.result.state === "resolved") {
            $query.resolvePromise(cacheKey, clientCachedPromise.result.value);
          } else {
            $query.rejectPromise(cacheKey, clientCachedPromise.result.error);
          }
          anySettled = true;
          return;
        }

        // Start loading
        $query.loadingPromise(
          cacheKey,
          query.fn(...paramsResult.resolvedParams)
        );
      },
      $queries,
      queries
    );
  } while (anySettled);
}

function usePlasmicQuery<T, F extends (...args: unknown[]) => Promise<T>>(
  $query: PlasmicQueryResult<T>,
  query: PlasmicQuery<F>,
  paramsResult: ResolveParamsResult<Parameters<F>>
): SWRResponse<T, unknown> {
  const $queryState = $query as StatefulQueryResult<T>;

  const { key, fetcher } = React.useMemo((): {
    key: string | null;
    fetcher: () => Promise<T>;
  } => {
    switch (paramsResult.status) {
      case "blocked":
      case "error": {
        return {
          key: null,
          fetcher: () => {
            throw new Error("fetcher unexpectedly invoked");
          },
        };
      }
      case "ready": {
        const cacheKey = makeQueryCacheKey(
          query.id,
          paramsResult.resolvedParams
        );
        return {
          key: cacheKey,
          fetcher: () => {
            const clientCachedPromise = GLOBAL_CACHE.get(cacheKey);
            if (clientCachedPromise?.result) {
              // If in global cache, transition directly to resolved/rejected.
              if (clientCachedPromise.result.state === "resolved") {
                $queryState.resolvePromise(
                  cacheKey,
                  clientCachedPromise.result.value as T
                );
              } else {
                $queryState.rejectPromise(
                  cacheKey,
                  clientCachedPromise.result.error
                );
              }
              return (clientCachedPromise.promise as Promise<T>).finally(() => {
                // Delete key from global cache after we're sure SWR has it
                GLOBAL_CACHE.delete(cacheKey);
              });
            } else {
              // Otherwise, transition to loading and call the function.
              const promise = query.fn(...paramsResult.resolvedParams);
              $queryState.loadingPromise(cacheKey, promise);
              return promise.finally(() => {
                // Delete key from global cache after we're sure SWR has it
                GLOBAL_CACHE.delete(cacheKey);
              });
            }
          },
        };
      }
    }
  }, [query, paramsResult]);

  const result = useMutablePlasmicQueryData(key, fetcher, {
    // If revalidateIfStale is true, then if there's a cache entry with a key,
    // but no mounted hook with that key yet, and when the hook mounts with the key,
    // swr will revalidate. This may be reasonable behavior, but for us, this
    // happens all the time -- we prepopulate the cache with proxy-invoked fetch,
    // sometimes before swr had a chance to run the effect.  So we turn off
    // revalidateIfStale here, and just let the user manage invalidation.
    revalidateIfStale: false,
  });

  // TODO: needed?
  if (!result.isLoading) {
    if (result.error) {
      $queryState.rejectPromise(key, result.error);
    } else if (key && result.data !== undefined) {
      $queryState.resolvePromise(key, result.data);
    }
  }

  return result;
}

export const _testonly = {
  GLOBAL_CACHE,
};
