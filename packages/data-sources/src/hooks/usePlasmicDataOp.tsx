import { usePlasmicDataSourceContext } from '@plasmicapp/data-sources-context';
import * as ph from '@plasmicapp/host';
import React from 'react';
import { DataOp, executePlasmicDataOp } from '../executor';
import { ManyRowsResult, Pagination, SingleRowResult } from '../types';
import { pick } from '../utils';
import {
  useMutablePlasmicQueryData,
  usePlasmicDataConfig,
} from '@plasmicapp/query';

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
      if (fetchingData.fetchingPromise) {
        return fetchingData.fetchingPromise;
      }
      const fetcherFn = () =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        executePlasmicDataOp<T>(dataOp!, {
          userAuthToken: ctx?.userAuthToken || undefined,
          user: ctx?.user,
          paginate: opts?.paginate,
        });
      const fetcherPromise = fetcherFn();
      fetchingData.fetchingPromise = fetcherPromise;
      return fetcherPromise;
    },
    [key, fetchingData]
  );
  const fetchAndUpdateCache = React.useMemo(
    () => () => {
      if (fetchingData.fetchingPromise) {
        // No need to update cache as the exist promise call site will do it
        return fetchingData.fetchingPromise;
      }
      const fetcherPromise = fetcher();
      fetcherPromise
        .then((data) => mutate(key, data))
        .catch((err) => {
          // Cache the error here to avoid infinite loop
          const keyInfo = key ? '$swr$' + key : '';
          cache.set(keyInfo, { ...(cache.get(keyInfo) ?? {}), error: err });
        });
      return fetcherPromise;
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
