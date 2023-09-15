import { usePlasmicDataSourceContext } from '@plasmicapp/data-sources-context';
import * as ph from '@plasmicapp/host';
import {
  useMutablePlasmicQueryData,
  usePlasmicDataConfig,
} from '@plasmicapp/query';
import React from 'react';
import { DataOp, executePlasmicDataOp } from '../executor';
import { ManyRowsResult, Pagination, SingleRowResult } from '../types';
import { pick } from '../utils';

export function makeCacheKey(
  dataOp: DataOp,
  opts?: { paginate?: Pagination; userAuthToken?: string | null }
) {
  const queryDependencies = JSON.stringify({
    sourceId: dataOp.sourceId,
    opId: dataOp.opId,
    args: dataOp.userArgs,
    userAuthToken: opts?.userAuthToken,
    paginate: opts?.paginate,
  });
  return dataOp.cacheKey
    ? `${dataOp.cacheKey}${queryDependencies}`
    : queryDependencies;
}

const enableLoadingBoundaryKey = 'plasmicInternalEnableLoadingBoundary';

function mkUndefinedDataProxy(
  promiseRef: { fetchingPromise: Promise<any> | undefined },
  fetchAndUpdateCache: () => Promise<any>
) {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'isPlasmicUndefinedDataProxy') {
          return true;
        }
        const promise = promiseRef.fetchingPromise || fetchAndUpdateCache();
        (promise as any).plasmicType = 'PlasmicUndefinedDataError';
        (promise as any).message = `Cannot read property ${String(
          prop
        )} - data is still loading`;
        throw promise;
      },
    }
  ) as any;
}

const reactMajorVersion = +React.version.split('.')[0];

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

export function usePlasmicDataOp<
  T extends SingleRowResult | ManyRowsResult,
  E = any
>(
  dataOp: DataOp | undefined,
  opts?: {
    paginate?: Pagination;
    noUndefinedDataProxy?: boolean;
  }
): Partial<T> & {
  error?: E;
  isLoading?: boolean;
} {
  const ctx = usePlasmicDataSourceContext();
  const enableLoadingBoundary = !!ph.useDataEnv?.()?.[enableLoadingBoundaryKey];
  const { mutate, cache } = usePlasmicDataConfig();
  const isNullDataOp = !dataOp;
  const key = isNullDataOp
    ? null
    : makeCacheKey(dataOp!, {
        paginate: opts?.paginate,
        userAuthToken: ctx?.userAuthToken,
      });
  const fetchingData = React.useMemo(
    () => ({
      fetchingPromise: undefined as Promise<T> | undefined,
    }),
    [key]
  );
  const fetcher = React.useMemo(
    () => () => {
      // If we are in this function, that means SWR cache missed.

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
      const fetcherFn = () =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        executePlasmicDataOp<T>(dataOp!, {
          userAuthToken: ctx?.userAuthToken || undefined,
          user: ctx?.user,
          paginate: opts?.paginate,
        });
      const fetcherPromise = fetcherFn();
      fetchingData.fetchingPromise = fetcherPromise;
      if (key) {
        PRE_FETCHES.set(key, fetcherPromise);
        fetcherPromise.then(() => {
          // Once we have a result, we rely on swr to perform the caching,
          // so remove from our cache as quickly as possible.
          PRE_FETCHES.delete(key);
        });
      }
      return fetcherPromise;
    },
    [key, fetchingData]
  );
  const fetchAndUpdateCache = React.useMemo(
    () => () => {
      // This function is called when the undefined data proxy is invoked.
      // USUALLY, this means the data is not available in SWR yet, and
      // we need to kick off a fetch.
      if (fetchingData.fetchingPromise) {
        // No need to update cache as the exist promise call site will do it
        return fetchingData.fetchingPromise;
      }

      // SOMETIMES, SWR actually _does_ have the cache, but we still end up
      // here.  That's because of how we update $queries, which takes two
      // cycles; each time we render, we build a `new$Queries`, and
      // `set$Queries(new$Queries)`.  So once the data is ready, at the
      // first render, we will have data in `new$Queries` but not `$queries`,
      // but we will still finish rendering that pass, which means any `$queries`
      // access will still end up here.  So we look into the SWR cache and
      // return any data that's here.
      const cached = cache.get(key);
      if (cached) {
        return Promise.resolve(cached);
      }
      const fetcherPromise = fetcher();
      fetcherPromise
        .then((data) => mutate(key, data))
        .catch((err) => {
          // Cache the error here to avoid infinite loop
          const keyInfo = key ? '$swr$' + key : '';
          cache.set(keyInfo, { ...(cache.get(keyInfo) ?? {}), error: err });
        });
      return fetchingData.fetchingPromise!;
    },
    [fetcher, fetchingData, cache, key]
  );
  const res = useMutablePlasmicQueryData<T, E>(key, fetcher, {
    shouldRetryOnError: false,
  });
  const { data, error, isLoading } = res;
  if (fetchingData.fetchingPromise != null && data !== undefined) {
    // Clear the fetching promise as the actual data is now used (so
    // revalidation is possible)
    fetchingData.fetchingPromise = undefined;
  }
  return React.useMemo(() => {
    const result = {
      ...(data ?? ({} as Partial<T>)),
      ...pick(res, 'isLoading', 'error'),
    };
    if (
      !opts?.noUndefinedDataProxy &&
      reactMajorVersion >= 18 &&
      enableLoadingBoundary &&
      (isLoading || isNullDataOp) &&
      result.data === undefined &&
      result.schema === undefined
    ) {
      result.data = mkUndefinedDataProxy(fetchingData, fetchAndUpdateCache);
      result.schema = mkUndefinedDataProxy(fetchingData, fetchAndUpdateCache);
    }
    return result;
  }, [
    isNullDataOp,
    data,
    error,
    isLoading,
    opts?.noUndefinedDataProxy,
    enableLoadingBoundary,
    fetchingData,
    fetchAndUpdateCache,
  ]);
}

export function usePlasmicDataMutationOp<
  T extends SingleRowResult | ManyRowsResult
>(dataOp: DataOp | undefined) {
  const { sourceId, opId, userArgs } = dataOp ?? {};
  const ctx = usePlasmicDataSourceContext();
  const userToken = ctx?.userAuthToken;
  return React.useCallback(async () => {
    if (!sourceId || !opId) {
      return undefined;
    }
    return executePlasmicDataOp<T>(
      { sourceId, opId, userArgs },
      {
        userAuthToken: userToken || undefined,
        user: ctx?.user,
      }
    );
  }, [sourceId, opId, userArgs, userToken]);
}
