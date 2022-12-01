import { usePlasmicDataSourceContext } from '@plasmicapp/data-sources-context';
import { SWRResponse, useMutablePlasmicQueryData } from '@plasmicapp/query';
import React from 'react';
import { DataOp, executePlasmicDataOp } from '../executor';
import { ManyRowsResult, Pagination, SingleRowResult } from '../types';
import { pick } from '../utils';

export function usePlasmicDataOp<
  T extends SingleRowResult | ManyRowsResult,
  E = any
>(
  dataOp: DataOp | undefined,
  opts?: {
    paginate?: Pagination;
  }
): Partial<T> & {
  error?: E;
  isLoading?: boolean;
} {
  const ctx = usePlasmicDataSourceContext();
  const res = useMutablePlasmicQueryData<T, E>(
    () =>
      dataOp
        ? dataOp.cacheKey
          ? dataOp.cacheKey
          : JSON.stringify({
              sourceId: dataOp.sourceId,
              opId: dataOp.opId,
              args: dataOp.userArgs,
              userAuthToken: ctx?.userAuthToken,
              paginate: opts?.paginate,
            })
        : null,
    async () => {
      return await executePlasmicDataOp<T>(dataOp!, {
        userAuthToken: ctx?.userAuthToken,
        paginate: opts?.paginate,
      });
    }
  );
  const { data, error, isLoading } = res;
  return React.useMemo(
    () => ({
      ...(data ?? ({} as Partial<T>)),
      ...pick(res, 'isLoading', 'error'),
    }),
    [data, error, isLoading]
  );
}

export function usePlasmicDataMutationOp<
  T extends SingleRowResult | ManyRowsResult
>(dataOp: DataOp | undefined, opts?: {}) {
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
        userAuthToken: userToken,
      }
    );
  }, [sourceId, opId, userArgs, userToken]);
}
