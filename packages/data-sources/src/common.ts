import {
  useMutablePlasmicQueryData,
  usePlasmicDataConfig,
} from "@plasmicapp/query";
// eslint-disable-next-line no-restricted-imports
import * as ph from "@plasmicapp/host";
import React from "react";
import { ClientQueryResult } from "./types";

export interface PlasmicUndefinedDataErrorPromise extends Promise<any> {
  plasmicType: "PlasmicUndefinedDataError";
  message: string;
}

export function isPlasmicUndefinedDataErrorPromise(
  x: any
): x is PlasmicUndefinedDataErrorPromise {
  return (
    !!x &&
    typeof x === "object" &&
    x?.plasmicType === "PlasmicUndefinedDataError"
  );
}

export function tagPlasmicUndefinedDataErrorPromise(
  promise: Promise<any>
): void {
  (promise as PlasmicUndefinedDataErrorPromise).plasmicType =
    "PlasmicUndefinedDataError";
  (promise as PlasmicUndefinedDataErrorPromise).message = "Query is not done";
}

export function untagPlasmicUndefinedDataErrorPromise(
  promise: Promise<any>
): void {
  delete (promise as Partial<PlasmicUndefinedDataErrorPromise>).plasmicType;
  delete (promise as Partial<PlasmicUndefinedDataErrorPromise>).message;
}

export function mkUndefinedDataProxy(
  promiseRef: { fetchingPromise: Promise<any> | undefined },
  fetchAndUpdateCache: (() => Promise<any>) | undefined
) {
  let fetchAndUpdatePromise: Promise<any> | undefined = undefined;

  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "isPlasmicUndefinedDataProxy") {
          return true;
        }

        if (!fetchAndUpdateCache) {
          // There's no key so no fetch to kick off yet; when computing key,
          // we encountered some thrown exception (that's not an undefined data promise),
          // and so we can't fetch yet. This might be dependent on a $state or $prop value
          // that's currently undefined, etc.  We will act like an undefined data object,
          // and trigger the usual fallback behavior
          return undefined;
        }

        const doFetchAndUpdate = () => {
          // We hold onto the promise last returned by fetchAndUpdateCache()
          // and keep reusing it until it is resolved. The reason is that the
          // Promise thrown here will be used as a dependency for memoized
          // fetchAndUpdateCache, which is a dependency on the memoized returned value
          // from usePlasmicDataOp(). If we have a fetch that's taking a long time,
          // we want to make sure that our memoized returned value is stable,
          // so that we don't keep calling setDollarQueries() (otherwise, for each
          // render, we find an unstable result, and call setDollarQueries(),
          // resulting in an infinite loop while fetch is happening).
          if (!fetchAndUpdatePromise) {
            fetchAndUpdatePromise = fetchAndUpdateCache().finally(() => {
              fetchAndUpdatePromise = undefined;
            });
          }
          return fetchAndUpdatePromise;
        };

        const promise =
          // existing fetch
          promiseRef.fetchingPromise ||
          // No existing fetch, so kick off a fetch
          doFetchAndUpdate();
        (promise as any).plasmicType = "PlasmicUndefinedDataError";
        (promise as any).message = `Cannot read property ${String(
          prop
        )} - data is still loading`;
        throw promise;
      },
    }
  ) as any;
}

const isRSC = (React as any).isRSC;
const reactMajorVersion = +React.version.split(".")[0];
const enableLoadingBoundaryKey = "plasmicInternalEnableLoadingBoundary";

/**
 * Fetches can be kicked off two ways -- normally, by useSWR(), or by some
 * expression accessing the `$queries.*` proxy when not ready yet. We need
 * a global cache for proxy-invoked caches, so that different components
 * with the same key can share the same fetch.
 *
 * The life cycle for this cache is short -- only the duration of a
 * proxy-invoked fetch, and once the fetch is done. That's because we really
 * just want SWR to be managing the cache, not us! Once the data is in SWR,
 * we will use SWR for getting data.
 */
const PRE_FETCHES = new Map<string, Promise<any>>();

/**
 * @typeParam T return type of fetcherFn
 * @typeParam R final result type via resultMapper
 * @typeParam E error type of fetcherFn
 */
export function usePlasmicFetch<T, R, E = any>(
  key: string | null,
  resolvedParams: any,
  fetcherFn: (resolvedParam: any) => Promise<T>,
  resultMapper: (
    result: ReturnType<typeof useMutablePlasmicQueryData<T, E>>
  ) => ClientQueryResult<R>,
  undefinedDataProxyFields: ("data" | "schema" | "error")[],
  opts: {
    fallbackData?: T;
    noUndefinedDataProxy?: boolean;
  }
): ClientQueryResult<R> {
  const enableLoadingBoundary = !!ph.useDataEnv?.()?.[enableLoadingBoundaryKey];
  const { mutate, cache } = isRSC
    ? ({} as any as Partial<ReturnType<typeof usePlasmicDataConfig>>)
    : usePlasmicDataConfig();
  // Cannot perform this operation
  const isNullParams = !resolvedParams;
  // This operation depends on another data query to resolve first
  const isWaitingOnDependentQuery =
    isPlasmicUndefinedDataErrorPromise(resolvedParams);
  const fetchingData = React.useMemo(
    () => ({
      fetchingPromise: undefined as Promise<T> | undefined,
    }),
    [key]
  );
  const fetcher = React.useMemo(
    () => () => {
      // If we are in this function, that means SWR cache missed.
      if (!key) {
        throw new Error(`Fetcher should never be called without a proper key`);
      }

      // dataOp is guaranteed to be a DataOp, and not an undefined promise or null

      if (fetchingData.fetchingPromise) {
        // Fetch is already underway from this hook
        return fetchingData.fetchingPromise;
      }

      if (key && PRE_FETCHES.has(key)) {
        // Some other usePlasmicDataOp() hook elsewhere has already
        // started this fetch as well; re-use it here.
        const existing = PRE_FETCHES.get(key) as Promise<T>;
        fetchingData.fetchingPromise = existing;
        return existing;
      }

      // Else we really need to kick off this fetch now...
      const fetcherPromise = fetcherFn(resolvedParams);
      fetchingData.fetchingPromise = fetcherPromise;
      if (key) {
        PRE_FETCHES.set(key, fetcherPromise);
        // Once we have a result, we rely on swr to perform the caching,
        // so remove from our cache as quickly as possible.
        fetcherPromise.then(
          () => {
            PRE_FETCHES.delete(key);
          },
          () => {
            PRE_FETCHES.delete(key);
          }
        );
      }
      return fetcherPromise;
    },
    [key, fetchingData]
  );

  const dependentKeyDataErrorPromise = isPlasmicUndefinedDataErrorPromise(
    resolvedParams
  )
    ? resolvedParams
    : undefined;
  const fetchAndUpdateCache = React.useMemo(() => {
    if (!key && !dependentKeyDataErrorPromise) {
      // If there's no key, and no data query we're waiting for, then there's
      // no way to perform a fetch
      return undefined;
    }
    return () => {
      // This function is called when the undefined data proxy is invoked.
      // USUALLY, this means the data is not available in SWR yet, and
      // we need to kick off a fetch.

      if (fetchingData.fetchingPromise) {
        // No need to update cache as the exist promise call site will do it
        return fetchingData.fetchingPromise;
      }

      if (dependentKeyDataErrorPromise) {
        // We can't actually fetch yet, because we couldn't even evaluate the dataOp
        // to fetch for, because we depend on unfetched data. Once _that_
        // dataOp we depend on is finished, then we can try again.  So we
        // will throw and wait for _that_ promise to be resolved instead.
        return dependentKeyDataErrorPromise;
      }

      if (!key) {
        throw new Error(`Expected key to be non-null`);
      }

      // SOMETIMES, SWR actually _does_ have the cache, but we still end up
      // here.  That's because of how we update $queries, which takes two
      // cycles; each time we render, we build a `new$Queries`, and
      // `set$Queries(new$Queries)`.  So once the data is ready, at the
      // first render, we will have data in `new$Queries` but not `$queries`,
      // but we will still finish rendering that pass, which means any `$queries`
      // access will still end up here.  So we look into the SWR cache and
      // return any data that's here.
      const cached = cache?.get(key);
      if (cached) {
        return Promise.resolve(cached);
      }
      const cachedError = cache?.get(`$swr$${key}`);
      if (cachedError) {
        return Promise.reject(cachedError.error);
      }

      // Now, upon this proxy.get() miss, we want to kick off the fetch. We can't
      // wait for useSWR() to kick off the fetch, because upon data miss we are
      // throwing a promise, and useSWR() won't kick off the fetch till the effect,
      // so it will never get a chance to fetch.  Instead, we fetch, and then we
      // put the fetched data into the SWR cache, so that next time useSWR() is called,
      // it will just find it in the cache.
      //
      // However, we don't want to fetch SYNCHRONOUSLY RIGHT NOW, becase we are in
      // the rendering phase (presumably, we're here because some component is trying
      // to read fetched data while rendering).  Doing a fetch right now would invoke
      // the fetcher, which is wrapped by @plasmicapp/query to tracking loading state,
      // and upon loading state toggled to true, it will fire loading event listeners,
      // and for example, our antd's <GlobalLoadingIndicator /> will listen to this
      // event and immediately ask antd to show the loading indicator, which mutates
      // antd component's state.  It is NOT LEGAL to call setState() on some other
      // component's state during rendering phase!
      //
      // We therefore will delay kicking off the fetch by a tick, so that we will safely
      // start the fetch outside of React rendering phase.
      const fetcherPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          fetcher().then(resolve, reject);
        }, 1);
      });
      if (!isRSC) {
        fetcherPromise
          .then((data) => {
            // Insert the fetched data into the SWR cache
            mutate?.(key, data);
          })
          .catch((err) => {
            // Cache the error here to avoid infinite loop
            const keyInfo = key ? "$swr$" + key : "";
            cache?.set(keyInfo, { ...(cache?.get(keyInfo) ?? {}), error: err });
          });
      }
      return fetcherPromise;
    };
  }, [fetcher, fetchingData, cache, key, dependentKeyDataErrorPromise]);
  const res = useMutablePlasmicQueryData<T, E>(key, fetcher, {
    fallbackData: opts?.fallbackData,
    shouldRetryOnError: false,

    // If revalidateIfStale is true, then if there's a cache entry with a key,
    // but no mounted hook with that key yet, and when the hook mounts with the key,
    // swr will revalidate. This may be reasonable behavior, but for us, this
    // happens all the time -- we prepopulate the cache with proxy-invoked fetch,
    // sometimes before swr had a chance to run the effect.  So we turn off
    // revalidateIfStale here, and just let the user manage invalidation.
    revalidateIfStale: false,
  });
  const { data, error, isLoading } = res;
  if (fetchingData.fetchingPromise != null && data !== undefined) {
    // Clear the fetching promise as the actual data is now used (so
    // revalidation is possible)
    fetchingData.fetchingPromise = undefined;
  }

  return React.useMemo(() => {
    const result = resultMapper(res);
    if (
      !opts?.noUndefinedDataProxy &&
      reactMajorVersion >= 18 &&
      enableLoadingBoundary &&
      (isLoading || isNullParams || isWaitingOnDependentQuery) &&
      undefinedDataProxyFields.every((field) => result[field] === undefined)
    ) {
      undefinedDataProxyFields.forEach((field) => {
        if (field === "error") {
          return;
        }
        result[field] = mkUndefinedDataProxy(fetchingData, fetchAndUpdateCache);
      });
    }
    return result;
  }, [
    isNullParams,
    isWaitingOnDependentQuery,
    data,
    error,
    isLoading,
    opts?.noUndefinedDataProxy,
    enableLoadingBoundary,
    fetchingData,
    fetchAndUpdateCache,
  ]);
}

/**
 * New getConfig that reuses the `global.__PLASMIC__` object instead of having multiple
 * keys in `global`.
 */
export function getConfig<T>(key: string, defaultValue: T) {
  if (typeof globalThis === "undefined") {
    return defaultValue;
  } else {
    return (globalThis as any).__PLASMIC__?.[key] ?? defaultValue;
  }
}
