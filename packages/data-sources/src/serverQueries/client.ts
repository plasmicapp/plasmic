import {
  useMutablePlasmicQueryData,
  wrapLoadingFetcher,
} from "@plasmicapp/query";
import {
  getConfig,
  isPlasmicUndefinedDataErrorPromise,
  usePlasmicFetch,
} from "../common";
import { ClientQueryResult, ServerQuery, ServerQueryResult } from "../types";
import { pick } from "../utils";
import { resolveParams } from "./common";

type StudioCacheWrapper = <F extends (...args: any[]) => Promise<any>>(
  id: string,
  fn: F,
  ...args: Parameters<F>
) => Promise<any>;

export function makeQueryCacheKey(id: string, params: any[]) {
  return `${id}:${JSON.stringify(params)}`;
}

export function usePlasmicServerQuery<
  F extends (...args: any[]) => Promise<any>
>(
  serverQuery: ServerQuery<F>,
  fallbackData?: ReturnType<F>,
  opts?: { noUndefinedDataProxy?: boolean }
): Partial<ServerQueryResult<ReturnType<F>>> {
  const resolvedParams = resolveParams(serverQuery.execParams, (err) => {
    if (isPlasmicUndefinedDataErrorPromise(err)) {
      return err;
    }
    throw err;
  });
  const key =
    !resolvedParams || isPlasmicUndefinedDataErrorPromise(resolvedParams)
      ? null
      : makeQueryCacheKey(serverQuery.id, resolvedParams);
  const wrapStudioCache: StudioCacheWrapper = getConfig(
    "EXECUTE_SERVER_QUERY",
    (_: string, fn: F, ...args: Parameters<F>) => fn(...args)
  );

  const fetcher = (params: Parameters<F>) => {
    return wrapLoadingFetcher(wrapStudioCache)(
      serverQuery.id,
      serverQuery.fn,
      ...params
    );
  };

  const resultMapper = (
    result: ReturnType<typeof useMutablePlasmicQueryData<ReturnType<F>, any>>
  ): ClientQueryResult<ReturnType<F>> => {
    return {
      ...pick(result, "data", "error", "isLoading"),
    };
  };

  return usePlasmicFetch(
    key,
    resolvedParams,
    fetcher,
    resultMapper,
    ["data", "error"],
    {
      fallbackData,
      ...opts,
    }
  );
}
