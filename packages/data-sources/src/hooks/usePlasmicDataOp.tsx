import { usePlasmicDataSourceContext } from '@plasmicapp/data-sources-context';
import { useMutablePlasmicQueryData } from '@plasmicapp/query';
import React from 'react';
import { DataOp, executePlasmicDataOp } from '../executor';
import { Pagination } from '../types';

export function usePlasmicDataOp<T = any, E = any>(
  dataOp: DataOp | undefined,
  opts?: {
    includeSchema?: boolean;
    paginate?: Pagination;
  }
) {
  const ctx = usePlasmicDataSourceContext();
  return useMutablePlasmicQueryData<T, E>(
    () =>
      dataOp
        ? dataOp.cacheKey
          ? dataOp.cacheKey
          : JSON.stringify({
              sourceId: dataOp.sourceId,
              opId: dataOp.opId,
              args: dataOp.userArgs,
              userAuthToken: ctx?.userAuthToken,
              includeSchema: opts?.includeSchema,
              paginate: opts?.paginate,
            })
        : null,
    async () => {
      return await executePlasmicDataOp<T>(dataOp!, {
        userAuthToken: ctx?.userAuthToken,
        includeSchema: opts?.includeSchema,
        paginate: opts?.paginate,
      });
    }
  );
}

export function usePlasmicDataMutationOp<T = any>(
  dataOp: DataOp | undefined,
  opts?: {
    includeSchema?: boolean;
  }
) {
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
        includeSchema: opts?.includeSchema,
      }
    );
  }, [sourceId, opId, userArgs, userToken]);
}
