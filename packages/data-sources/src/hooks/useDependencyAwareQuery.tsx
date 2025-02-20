import React from "react";
import { DataOpConfig } from "../components/Fetcher";
import { DataOp } from "../types";
import { swallow } from "../utils";
import { usePlasmicDataOp } from "./usePlasmicDataOp";

function usePrevious<T>(value: T | undefined): T | undefined {
  const prevValue = React.useRef<T | undefined>(undefined);

  React.useEffect(() => {
    prevValue.current = value;

    return () => {
      prevValue.current = undefined;
    };
  });

  return prevValue.current;
}

export interface DependencyAwareQueryConfig extends DataOpConfig {
  $queries: Record<string, any>;
  setDollarQueries: ($queries: Record<string, any>) => void;
  getDataOp: () => DataOp;
}

/**
 * @deprecated Prefer using `usePlasmicDataOp` directly instead.
 */
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
  const finalName = name ?? "data";
  const prevName = usePrevious(finalName);
  React.useEffect(() => {
    if (!(finalName in $queries) || $queries[finalName] !== data) {
      const $queries2 = {
        ...$queries,
        [finalName]: data,
      };
      if (prevName && finalName !== prevName && prevName in $queries) {
        delete $queries2[prevName];
      }
      setDollarQueries($queries2);
    }
  }, [finalName, prevName, data, $queries, setDollarQueries]);
}
