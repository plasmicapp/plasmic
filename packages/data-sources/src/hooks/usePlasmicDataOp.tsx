import { usePlasmicDataSourceContext } from '@plasmicapp/data-sources-context';
import { useMutablePlasmicQueryData } from '@plasmicapp/query';
import React from 'react';
import { DataOp, executePlasmicDataOp } from '../executor';

export function usePlasmicDataOp<T = any, E = any>(dataOp: DataOp | undefined) {
  const ctx = usePlasmicDataSourceContext();
  return useMutablePlasmicQueryData<T, E>(
    () =>
      dataOp
        ? JSON.stringify({
            sourceId: dataOp.sourceId,
            opId: dataOp.opId,
            args: dataOp.userArgs,
          })
        : null,
    async () => {
      return await executePlasmicDataOp<T>(dataOp!, {
        userAuthToken: ctx?.userAuthToken,
      });
    }
  );
}

export function usePlasmicDataMutationOp<T = any>(dataOp: DataOp | undefined) {
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
