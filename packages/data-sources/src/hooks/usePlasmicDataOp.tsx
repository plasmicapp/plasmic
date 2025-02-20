import { usePlasmicDataSourceContext } from "@plasmicapp/data-sources-context";
import {
  useMutablePlasmicQueryData,
  usePlasmicDataConfig,
} from "@plasmicapp/query";
import * as React from "react";
import { isPlasmicUndefinedDataErrorPromise, usePlasmicFetch } from "../common";
import { executePlasmicDataOp } from "../executor";
import {
  ClientQueryResult,
  DataOp,
  ManyRowsResult,
  Pagination,
  SingleRowResult,
} from "../types";
import { pick } from "../utils";

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

/**
 * Returns a function that can be used to invalidate Plasmic query groups.
 */
export function usePlasmicInvalidate() {
  // NOTE: we use `revalidateIfStale: false` with SWR.
  // One quirk of this is that if you supply fallback data to swr,
  // that data doesn't get entered into the cache if `revalidateIfStale: false`,
  // so you won't see it if you iterate over keys of the cache. That's why
  // we have usePlasmicInvalidate() which will iterate over both the cache
  // and the fallback data.
  const { cache, fallback, mutate } = usePlasmicDataConfig();
  return async (invalidatedKeys: string[] | null | undefined) => {
    const getKeysToInvalidate = () => {
      if (!invalidatedKeys) {
        return [];
      }
      const allKeys = Array.from(
        new Set([
          ...Array.from((cache as any).keys()),
          ...(fallback ? Object.keys(fallback) : []),
          // If this is running within the Studio, we also take the
          // opportunity to invalidate the Studio cache. The keys that
          // Studio may have can be a superset of `cache` here, because
          // `cache` is updated as swr hooks are mounted and unmounted,
          // but Studio's data cache keys don't get removed when hooks
          // are unmounted. This makes it possible for Studio to hold
          // onto a stale cache entry that doesn't get invalidated.
          // For example, Studio may render page1, with key X, then goes
          // to page 2, which performs a mutate. At this point, Studio
          // has a cache entry for key X, but `cache` does not, because
          // page2 does not use that query. But page 2 may perform a
          // mutation that invalidates X. So we need to invalidate not
          // only keys in `cache`, but also keys that Studio is still
          // holding onto.
          ...((globalThis as any).__PLASMIC_GET_ALL_CACHE_KEYS?.() ?? []),
        ])
      ).filter((key): key is string => typeof key === "string");
      if (invalidatedKeys.includes("plasmic_refresh_all")) {
        return allKeys;
      }
      return allKeys.filter((key) =>
        invalidatedKeys.some((k) => key.includes(`.$.${k}.$.`))
      );
    };

    const keys = getKeysToInvalidate();
    if (keys.length === 0) {
      return;
    }

    const invalidateKey = async (key: string) => {
      const studioInvalidate = (globalThis as any).__PLASMIC_MUTATE_DATA_OP;
      if (studioInvalidate) {
        await studioInvalidate(key);
      }
      return mutate(key);
    };

    return await Promise.all(keys.map((key) => invalidateKey(key)));
  };
}

type ResolvableDataOp =
  | DataOp
  | undefined
  | null
  | (() => DataOp | undefined | null);

/**
 * This returns either:
 * * DataOp to perform
 * * undefined/null, if no data op can be performed
 * * PlasmicUndefinedDataErrorPromise, if when trying to evaluate the DataOp to perform,
 *   we encounter a PlasmicUndefinedDataErrorPromise, so this operation cannot be
 *   performed until that promise is resolved.
 */
function resolveDataOp(dataOp: ResolvableDataOp) {
  if (typeof dataOp === "function") {
    try {
      return dataOp();
    } catch (err) {
      if (isPlasmicUndefinedDataErrorPromise(err)) {
        return err;
      }
      return null;
    }
  } else {
    return dataOp;
  }
}

export function usePlasmicDataOp<
  T extends SingleRowResult | ManyRowsResult,
  E = any
>(
  dataOp: ResolvableDataOp,
  opts?: {
    paginate?: Pagination;
    noUndefinedDataProxy?: boolean;
  }
): ClientQueryResult<T["data"]> {
  const resolvedDataOp = resolveDataOp(dataOp);
  const ctx = usePlasmicDataSourceContext();
  const key =
    !resolvedDataOp || isPlasmicUndefinedDataErrorPromise(resolvedDataOp)
      ? null
      : makeCacheKey(resolvedDataOp, {
          paginate: opts?.paginate,
          userAuthToken: ctx?.userAuthToken,
        });
  const fetcher = (op: DataOp) => {
    return executePlasmicDataOp<T>(op, {
      userAuthToken: ctx?.userAuthToken || undefined,
      user: ctx?.user,
      paginate: opts?.paginate,
    });
  };
  const resultMapper = (
    result: ReturnType<typeof useMutablePlasmicQueryData<T["data"], E>>
  ): ClientQueryResult<T["data"]> => {
    return {
      ...(result.data ?? {}),
      ...pick(result, "error", "isLoading"),
    };
  };
  return usePlasmicFetch<T["data"], E>(
    key,
    resolvedDataOp,
    fetcher,
    resultMapper,
    ["data", "schema", "error"],
    {
      noUndefinedDataProxy: opts?.noUndefinedDataProxy,
    }
  );
}

export function usePlasmicDataMutationOp<
  T extends SingleRowResult | ManyRowsResult
>(dataOp: ResolvableDataOp) {
  const ctx = usePlasmicDataSourceContext();
  const userToken = ctx?.userAuthToken;

  const getRealDataOp = React.useCallback(async () => {
    const tryGetRealDataOp = async (): Promise<DataOp | null> => {
      const resolved = resolveDataOp(dataOp);
      if (!resolved) {
        return null;
      } else if (isPlasmicUndefinedDataErrorPromise(resolved)) {
        // If calling the dataOp function resulted in a data fetch,
        // then we wait for the data fetch to finish and try
        // again
        await resolved;
        return tryGetRealDataOp();
      } else {
        return resolved;
      }
    };
    return await tryGetRealDataOp();
  }, [dataOp]);

  return React.useCallback(async () => {
    const { sourceId, opId, userArgs } = (await getRealDataOp()) ?? {};

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
  }, [getRealDataOp, userToken]);
}
