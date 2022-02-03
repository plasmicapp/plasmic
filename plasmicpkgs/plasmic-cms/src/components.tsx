import React from "react";
import { ComponentMeta, repeatedElement } from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
import { DatabaseConfig, mkApi, QueryParams } from "./api";
import {
  DatabaseProvider,
  QueryProvider,
  RowProvider,
  TablesProvider,
  useDatabase,
  useQuery,
  useRow,
  useTables,
} from "./context";
import { ApiCmsRow, ApiCmsTable } from "./schema";
import { CanvasComponentProps } from "@plasmicapp/host/registerComponent";
import { mkFieldOptions, mkTableOptions } from "./util";

const modulePath = "@plasmicpkgs/plasmic-cms";
const componentPrefix = "hostless-plasmic-cms";

function renderMaybeData<T>(
  maybeData: ReturnType<typeof usePlasmicQueryData>,
  renderFn: (data: T) => JSX.Element
): JSX.Element {
  if ("error" in maybeData) {
    return <div>Error: {maybeData.error?.message}</div>;
  }
  if (!("data" in maybeData)) {
    return <div>Loading...</div>;
  }
  return renderFn(maybeData.data as T);
}

interface CmsDataProviderProps extends DatabaseConfig {
  children?: React.ReactNode;
}

// TODO: Remove `children` from props and make cmsDataProviderMeta a
// ContextMeta.
export const cmsDataProviderMeta: ComponentMeta<CmsDataProviderProps> = {
  name: `${componentPrefix}-data-provider`,
  displayName: "CMS Data Provider",
  importName: "CmsDataProvider",
  importPath: modulePath,
  props: {
    apiUrl: {
      type: "string",
      description: "API URL",
      defaultValue: "https://studio.plasmic.app/api/v1",
    },
    databaseId: {
      type: "string",
      description: "Database ID",
    },
    projectId: {
      type: "string",
      description: "Project ID",
    },
    projectApiToken: {
      type: "string",
      description: "Project API token",
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [],
      },
    },
  },
};

export function CmsDataProvider({ children, ...config }: CmsDataProviderProps) {
  return (
    <DatabaseProvider config={config}>
      <TablesFetcher>{children}</TablesFetcher>
    </DatabaseProvider>
  );
}

function TablesFetcher({ children }: { children: React.ReactNode }) {
  const databaseConfig = useDatabase();

  const cacheKey = JSON.stringify({
    component: "TablesFetcher",
    databaseConfig,
  });
  const maybeData = usePlasmicQueryData(cacheKey, async () =>
    mkApi(databaseConfig).fetchTables()
  );

  return renderMaybeData<ApiCmsTable[]>(maybeData, tables => (
    <TablesProvider tables={tables}>{children}</TablesProvider>
  ));
}

type TablesContextData = {
  tables: ApiCmsTable[];
};

interface CmsQueryLoaderProps
  extends QueryParams,
    CanvasComponentProps<TablesContextData> {
  children?: React.ReactNode;
  table: string;
}

export const cmsQueryLoaderMeta: ComponentMeta<CmsQueryLoaderProps> = {
  name: `${componentPrefix}-query-loader`,
  displayName: "CMS Query Loader",
  importName: "CmsQueryLoader",
  importPath: modulePath,
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: `${componentPrefix}-row-repeater`,
      },
    },
    table: {
      type: "choice",
      description: "Table identifier",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
    },
    limit: {
      type: "number",
      description: "Limit",
    },
    orderBy: {
      type: "choice",
      description: "Order by",
      options: ({ table }, ctx) => mkFieldOptions(ctx?.tables, table),
    },
    filter: {
      type: "object",
      description: "Filter",
    },
  },
};

export function CmsQueryLoader({
  table,
  children,
  setControlContextData,
  ...params
}: CmsQueryLoaderProps) {
  const databaseConfig = useDatabase();
  const tables = useTables();

  const cacheKey = JSON.stringify({
    component: "CmsQueryLoader",
    table,
    databaseConfig,
  });
  const maybeData = usePlasmicQueryData(cacheKey, async () =>
    mkApi(databaseConfig).query(table, params)
  );

  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({ tables });
  }

  return renderMaybeData<ApiCmsRow[]>(maybeData, rows => (
    <QueryProvider table={table} rows={rows}>
      {children}
    </QueryProvider>
  ));
}

interface CmsRowRepeaterProps extends CanvasComponentProps<TablesContextData> {
  children?: React.ReactNode;
  table: string;
}

export const cmsRowRepeaterMeta: ComponentMeta<CmsRowRepeaterProps> = {
  name: `${componentPrefix}-row-repeater`,
  displayName: "CMS Row Repeater",
  importName: "CmsRowRepeater",
  importPath: modulePath,
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: `${componentPrefix}-row-field`,
      },
    },
    table: {
      type: "choice",
      description: "Table identifier",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
    },
  },
};

export function CmsRowRepeater({
  table,
  children,
  setControlContextData,
}: CmsRowRepeaterProps) {
  const rows = useQuery(table);
  if (!rows) {
    throw new Error("Component must be wrapped in 'CMS Query Loader'.");
  }

  const tables = useTables();
  if (tables) {
    setControlContextData?.({ tables });
  }

  return (
    <>
      {rows.map((row, index) => (
        <RowProvider table={table} row={row}>
          {repeatedElement(index === 0, children)}
        </RowProvider>
      ))}
    </>
  );
}

interface CmsRowFieldProps extends CanvasComponentProps<TablesContextData> {
  table: string;
  field: string;
  className?: string;
}

export const cmsRowFieldMeta: ComponentMeta<CmsRowFieldProps> = {
  name: `${componentPrefix}-row-field`,
  displayName: "CMS Row Field",
  importName: "CmsRowField",
  importPath: modulePath,
  props: {
    table: {
      type: "choice",
      description: "Table identifier",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
    },
    field: {
      type: "choice",
      description: "Field identifier",
      options: ({ table }, ctx) => mkFieldOptions(ctx?.tables, table),
    },
  },
};

export function CmsRowField({
  className,
  table,
  field,
  setControlContextData,
}: CmsRowFieldProps) {
  const row = useRow(table);
  if (!row) {
    throw new Error(
      "Component must be wrapped in 'CMS Row Repeater' or 'CMS Row Loader'."
    );
  }

  const tables = useTables();
  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({ tables });
  }

  const value = row.data[field];
  return <div className={className}>{value}</div>;
}

interface CmsRowLinkProps extends CanvasComponentProps<TablesContextData> {
  table: string;
  field: string;
  hrefProp: string;
  children: React.ReactNode;
}

export const cmsRowLinkMeta: ComponentMeta<CmsRowLinkProps> = {
  name: `${componentPrefix}-row-link`,
  displayName: "CMS Row Link",
  importName: "CmsRowLink",
  importPath: modulePath,
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        tag: "a",
        value: "Link",
      },
    },
    table: {
      type: "choice",
      description: "Table identifier",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
    },
    field: {
      type: "choice",
      description: "Field identifier",
      options: ({ table }, ctx) => mkFieldOptions(ctx?.tables, table),
    },
    hrefProp: {
      type: "string",
      description: "Prop to inject into children",
      defaultValue: "href",
    },
  },
};

export function CmsRowLink({
  table,
  field,
  hrefProp,
  children,
  setControlContextData,
}: CmsRowLinkProps) {
  const row = useRow(table);
  if (!row) {
    throw new Error(
      "Component must be wrapped in 'CMS Row Repeater' or 'CMS Row Loader'."
    );
  }

  const tables = useTables();
  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({ tables });
  }

  const value = row.data[field];
  console.log(`TODO: Add "${value}" to "${hrefProp}" prop.`);

  return <>{children}</>;
}

interface CmsRowLoaderProps extends CanvasComponentProps<TablesContextData> {
  table: string;
  row: string;
  children: React.ReactNode;
}

export const cmsRowLoaderMeta: ComponentMeta<CmsRowLoaderProps> = {
  name: `${componentPrefix}-row-loader`,
  displayName: "CMS Row Loader",
  importName: "CmsRowLoader",
  importPath: modulePath,
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: `${componentPrefix}-row-field`,
      },
    },
    table: {
      type: "choice",
      description: "Table identifier",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
    },
    row: {
      type: "string",
      description: "Row identifier",
    },
  },
};

export function CmsRowLoader({
  table,
  row,
  children,
  setControlContextData,
}: CmsRowLoaderProps) {
  const databaseConfig = useDatabase();

  const tables = useTables();
  if (tables) {
    setControlContextData?.({ tables });
  }

  const cacheKey = JSON.stringify({
    component: "CmsRowLoader",
    table,
    row,
    databaseConfig,
  });
  const maybeData = usePlasmicQueryData(cacheKey, async () =>
    mkApi(databaseConfig).fetchRow(table, row)
  );
  return renderMaybeData<ApiCmsRow>(maybeData, row => (
    <RowProvider table={table} row={row}>
      {children}
    </RowProvider>
  ));
}
