import React from 'react';
import { DataOpConfig } from '../components/Fetcher';
import { DataOp } from '../executor';
import { swallow } from '../utils';
import { usePlasmicDataOp } from './usePlasmicDataOp';

export interface DependencyAwareQueryConfig extends DataOpConfig {
  $queries: Record<string, any>;
  setDollarQueries: ($queries: Record<string, any>) => void;
  getDataOp: () => DataOp;
}

export function useDependencyAwareQuery({
  $queries,
  getDataOp,
  setDollarQueries,
  name,
  pageIndex,
  pageSize,
}: DependencyAwareQueryConfig) {
  const data = usePlasmicDataOp(swallow(getDataOp), {
    ...(!!pageIndex &&
      !!pageSize && {
        paginate: { pageIndex, pageSize },
      }),
  });
  React.useEffect(() => {
    const finalName = name ?? 'data';
    if (!(finalName in $queries) || $queries[finalName] !== data) {
      setDollarQueries({ ...$queries, [finalName]: data });
    }
  }, [name, data, $queries, setDollarQueries]);
}
