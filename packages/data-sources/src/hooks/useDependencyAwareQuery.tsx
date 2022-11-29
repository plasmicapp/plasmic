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
  includeSchema,
  name,
  pageIndex,
  pageSize,
}: DependencyAwareQueryConfig) {
  const { data, error } = usePlasmicDataOp(swallow(getDataOp), {
    includeSchema,
    ...(!!pageIndex &&
      !!pageSize && {
        paginate: { pageIndex, pageSize },
      }),
  });
  React.useEffect(() => {
    if (error) {
      console.error(
        `Error while executing data source operation${name ? ` ${name}` : ''}:`,
        error
      );
    }
  }, [error]);
  React.useEffect(() => {
    const finalName = name ?? 'data';
    if (!(finalName in $queries) || $queries[finalName] !== data) {
      setDollarQueries({ ...$queries, [finalName]: data });
    }
  }, [name, data, $queries, setDollarQueries]);
}
