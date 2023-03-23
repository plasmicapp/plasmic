import fetch from '@plasmicapp/isomorphic-unfetch';
import { wrapLoadingFetcher } from '@plasmicapp/query';
import { ManyRowsResult, Pagination, SingleRowResult } from './types';

const DEFAULT_HOST = 'https://data.plasmic.app';

export interface DataOp {
  sourceId: string;
  opId: string;
  userArgs?: Record<string, any>;
  cacheKey?: string;
  invalidatedKeys?: string[];
}

export async function executePlasmicDataOp<
  T extends SingleRowResult | ManyRowsResult
>(
  op: DataOp,
  opts?: {
    userAuthToken?: string;
    paginate?: Pagination;
  }
) {
  const func = getConfig(
    '__PLASMIC_EXECUTE_DATA_OP',
    _executePlasmicDataOp
  ) as typeof _executePlasmicDataOp;
  const res = await wrapLoadingFetcher(func)(op, opts);
  return res as T;
}

async function _executePlasmicDataOp<
  T extends SingleRowResult | ManyRowsResult
>(
  op: DataOp,
  opts?: {
    userAuthToken?: string;
    paginate?: Pagination;
  }
) {
  const host = getConfig('__PLASMIC_DATA_HOST', DEFAULT_HOST);

  const url = `${host}/api/v1/server-data/sources/${op.sourceId}/execute`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.userAuthToken && {
        'x-plasmic-data-user-auth-token': opts.userAuthToken,
      }),
    },
    body: JSON.stringify({
      opId: op.opId,
      userArgs: op.userArgs ?? {},
      paginate: opts?.paginate,
    }),
  });
  if (resp.status !== 200) {
    const text = await resp.text();
    throw new Error(text);
  }
  return (await resp.json()) as T;
}

function getConfig<T>(key: string, defaultValue: T) {
  if (typeof globalThis === 'undefined') {
    return defaultValue;
  } else {
    return (globalThis as any)[key] ?? defaultValue;
  }
}
