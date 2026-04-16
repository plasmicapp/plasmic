import {
  SWRResponse,
  useMutablePlasmicQueryData,
  usePlasmicDataConfig,
  wrapLoadingFetcher,
} from "@plasmicapp/query";
import * as React from "react";
import { mapRecordEntries, mapRecords, noopFn, notNil } from "../utils";
import {
  StatefulQueryResult,
  StatefulQueryState,
  SyncPromise,
  createDollarQueries,
  resolveParams,
  shallowEqualRecords,
  useRenderEffect,
} from "./common";
import { makeQueryCacheKey } from "./makeQueryCacheKey";
import { PlasmicQuery, PlasmicQueryResult, QueryComponentNode } from "./types";

const GLOBAL_CACHE = new Map<string, SyncPromise<unknown>>();

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
 * export const serverQueryTree = {
 *   type: "component",
 *   queries: {
 *     films: { fn: $$.fetch, id: "fetch", args: ({ $q, $props, $ctx }) => [...] }
 *   },
 *   propsContext: {},
 * };
 *
 * export function ClientComponent($props, $ctx) {
 *   const $q = usePlasmicQueries(serverQueryTree, $props, $ctx);
 *   return <div>{$q.films.data}</div>
 * }
 */
export function usePlasmicQueries(
  tree: QueryComponentNode,
  $props: Record<string, unknown>,
  $ctx: Record<string, unknown>,
  $state?: Record<string, unknown>
): Record<string, PlasmicQueryResult> {
  // Query invalidation should follow top-level prop/context changes,
  // not object recreation from re-renders.
  const stableProps = useShallowStableRecord($props);
  const stableCtx = useShallowStableRecord($ctx);
  // $state is a valtio proxy with a stable reference, so we use a ref to
  // capture the latest value lazily at execParams call time. This avoids a
  // circular dependency with useDollarState (which depends on $q).
  const $stateRef = React.useRef($state ?? {});
  $stateRef.current = $state ?? {};
  const $queries = React.useMemo(
    () => createDollarQueries(Object.keys(tree.queries)),
    [tree]
  );
  const queries = React.useMemo(() => {
    return mapRecords(
      (_name, q) => ({
        id: q.id,
        fn: q.fn,
        execParams: () =>
          q.args({
            $q: $queries,
            $props: stableProps,
            $ctx: stableCtx,
            $state: $stateRef.current,
            $scopedItemVars: {},
          }),
      }),
      tree.queries
    );
  }, [$queries, stableCtx, stableProps, tree]);

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
  const wrappedQueries = React.useMemo(() => wrapQueries(queries), [queries]);
  const $queryStates = $queries as Record<string, StatefulQueryResult>;
  const { fallback: prefetchedCache, cache: swrCache } = usePlasmicDataConfig();

  // Normally, useMutablePlasmicQueryData re-renders when its own query settles.
  // However, it will NOT re-render when dependent queries settle or reset due to prop change.
  // This counter forces useMutablePlasmicQueryData to re-resolve params.
  const [settledCount, setSettledCount] = React.useState(0);
  React.useEffect(() => {
    let cleanup = false;
    const resultListener = (
      next: StatefulQueryState,
      prev: StatefulQueryState
    ) => {
      if (cleanup) {
        return;
      }

      if (prev.state === "done" || next.state === "done") {
        // Queue microtask since the listener may run during the render phase
        // due to useRenderEffect.
        queueMicrotask(() => setSettledCount((v) => v + 1));
      }
    };
    mapRecords((_queryName, $query) => {
      $query.addListener(resultListener);
    }, $queryStates);
    return () => {
      cleanup = true;
      mapRecords((_queryName, $query) => {
        $query.removeListener(resultListener);
      }, $queryStates);
    };
  }, [$queryStates]);

  // Start queries during the render phase with useRenderEffect.
  useRenderEffect(
    (prevDeps) => {
      // If wrappedQueries changed, something in the query execParams changed ($ctx or $props)
      // Existing resolved params may no longer be correct, so we reset all $queries to force params
      // to re-resolve. If params are unchanged, cached data will be resolved immediately.
      if (prevDeps) {
        const prevWrappedQueries: Record<string, PlasmicQuery> = prevDeps[0];
        if (!Object.is(prevWrappedQueries, wrappedQueries)) {
          mapRecords((_queryName, $query) => {
            $query.reset();
          }, $queryStates);
        }
      }

      // Core loop that starts queries outside SWR and checks caches.
      let cleanup = false;
      const loop = async () => {
        while (true) {
          initPlasmicQueriesSync(
            $queryStates,
            wrappedQueries,
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

          await Promise.race(loadingQueries);
          if (cleanup) {
            break;
          }
        }
      };

      loop()
        // Avoid PromiseRejectionHandledWarning on internal promise that users can't catch.
        .catch(noopFn);
      return () => {
        cleanup = true;
      };
    },
    [wrappedQueries, $queryStates, settledCount]
  );

  mapRecords(
    (_queryName, $query, query) => {
      usePlasmicQuery($query, query, settledCount);
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
      execParams: query.execParams,
    };
  }, queries);
}

/**
 * Synchronously resolves params and resolves from cache or starts loading.
 * This function does as much as possible without awaiting any promises.
 */
function initPlasmicQueriesSync(
  $queries: Record<string, StatefulQueryResult>,
  queries: Record<string, PlasmicQuery>,
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
      (_queryName, $query, query) => {
        if ($query.current.state !== "initial") {
          return;
        }

        const paramsResult = resolveParams(query.execParams);
        if (paramsResult.status === "error") {
          // params errored, reject and don't try again next iteration
          $query.rejectPromise(null, paramsResult.error);
          anySettled = true;
          return;
        } else if (paramsResult.status === "blocked") {
          // params blocked, try again next iteration if any resolved
          return;
        } // else paramsResult.status === "ready

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

/**
 * TODO: Use paramsResult from usePlasmicQueries to avoid double param resolution.
 */
function usePlasmicQuery<T, F extends (...args: any[]) => Promise<T>>(
  $query: PlasmicQueryResult<T>,
  query: PlasmicQuery<F>,
  settledCount?: number
): SWRResponse<T, unknown> {
  const $queryState = $query as StatefulQueryResult<T>;

  // Since query.execParams never changes, we need a way to know when to retry
  // resolving params. The parent can pass in settledCount that increments as
  // queries settle.
  const paramsResult = React.useMemo(() => {
    return resolveParams(query.execParams);
  }, [query.execParams, settledCount]);

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
            const promise = query.fn(...paramsResult.resolvedParams);
            $queryState.loadingPromise(cacheKey, promise);
            return promise.finally(() => {
              GLOBAL_CACHE.delete(cacheKey);
            });
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

function useShallowStableRecord<T extends Record<string, unknown>>(
  value: T
): T {
  const ref = React.useRef(value);
  if (!shallowEqualRecords(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
}

export const _testonly = {
  GLOBAL_CACHE,
};
