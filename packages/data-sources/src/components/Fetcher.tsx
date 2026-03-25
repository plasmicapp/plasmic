import { CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import React from "react";
import { usePlasmicDataOp } from "../hooks/usePlasmicDataOp";
import { DataOp } from "../types";

/** @deprecated See https://docs.plasmic.app/learn/integrations */
export interface DataOpConfig {
  name?: string;
  pageIndex?: number;
  pageSize?: number;
}

/** @deprecated See https://docs.plasmic.app/learn/integrations */
export interface FetcherProps extends DataOpConfig {
  dataOp?: DataOp;
  children?: ($queries: Record<string, any>) => React.ReactElement | null;
  queries?: Record<string, any>;
}

/** @deprecated See https://docs.plasmic.app/learn/integrations */
export function Fetcher(props: FetcherProps): React.ReactElement | null {
  const { dataOp, children, name, pageIndex, pageSize } = props;
  const data = usePlasmicDataOp(dataOp, {
    ...(!!pageIndex &&
      !!pageSize && {
        paginate: { pageIndex, pageSize },
      }),
  });

  const $queries = React.useMemo(
    () => ({ ...props.queries, [name ?? "data"]: data }),
    [props.queries, name, data]
  );

  return children?.($queries) ?? null;
}

/** @deprecated See https://docs.plasmic.app/learn/integrations */
export const FetcherMeta: CodeComponentMeta<FetcherProps> = {
  name: "plasmic-data-source-fetcher",
  displayName: "Data Fetcher",
  props: {
    dataOp: {
      type: "dataSourceOp" as any,
      displayName: "Data",
    },
    name: {
      type: "string",
      displayName: "Variable name",
    },
    children: {
      type: "slot",
      renderPropParams: ["$queries"],
    },
    pageSize: {
      type: "number",
      advanced: true,
      displayName: "Page size",
      description: "Only fetch in batches of this size; for pagination",
    },
    pageIndex: {
      type: "number",
      advanced: true,
      displayName: "Page index",
      description: "0-based index of the paginated page to fetch",
    },
  },
  importPath: "@plasmicapp/react-web/lib/data-sources",
  importName: "Fetcher",
  alwaysAutoName: true,
  styleSections: false,
};
