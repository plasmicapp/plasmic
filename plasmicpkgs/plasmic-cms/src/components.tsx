import { ComponentMeta, repeatedElement } from "@plasmicapp/host";
import { CanvasComponentProps } from "@plasmicapp/host/registerComponent";
import { usePlasmicQueryData } from "@plasmicapp/query";
import React from "react";
import { DatabaseConfig, mkApi, QueryParams } from "./api";
import {
  DatabaseProvider,
  QueryResultProvider,
  RowProvider,
  TablesProvider,
  useDatabase,
  useQueryResults,
  useRow,
  useTables,
} from "./context";
import { ApiCmsRow, ApiCmsTable, CmsType } from "./schema";
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

const defaultHost = "https://studio.plasmic.app";

// TODO: Remove `children` from props and make cmsDataProviderMeta a
// ContextMeta.
export const cmsDataProviderMeta: ComponentMeta<CmsDataProviderProps> = {
  name: `${componentPrefix}-data-provider`,
  displayName: "CMS Data Provider",
  importName: "CmsDataProvider",
  importPath: modulePath,
  props: {
    host: {
      type: "string",
      displayName: "Studio URL",
      description: `The default host for use in production is ${defaultHost}.`,
      defaultValue: defaultHost,
      defaultValueHint: defaultHost,
    },
    databaseId: {
      type: "string",
      displayName: "CMS ID",
      description: "The ID of the CMS (database) to use.",
    },
    projectId: {
      type: "string",
      displayName: "Project ID",
      description: "This project's ID.",
    },
    projectApiToken: {
      type: "string",
      displayName: "Project API token",
      description: "This project's API token.",
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
  config.host = config.host || defaultHost;
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
  table?: string;
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
      displayName: "Model",
      description: "CMS model (table) to query.",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
    },
    useDraft: {
      type: "boolean",
      displayName: "Use drafts?",
      description: "If set, also query unpublished content.",
      defaultValue: false,
    },
    where: {
      type: "object",
      displayName: "Filter",
      description: "Filter clause, in JSON format.",
    },
    orderBy: {
      type: "choice",
      displayName: "Order by",
      description: "Field to order by.",
      options: ({ table }, ctx) => mkFieldOptions(ctx?.tables, table),
    },
    desc: {
      type: "boolean",
      displayName: "Sort descending?",
      description: 'Sort descending by "Order by" field.',
      defaultValue: false,
    },
    limit: {
      type: "number",
      displayName: "Limit",
      description: "Maximum number of entries to fetch (0 for unlimited).",
      defaultValue: 0,
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
  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({ tables });
  }

  const cacheKey = JSON.stringify({
    component: "CmsQueryLoader",
    table,
    databaseConfig,
    params,
  });
  const maybeData = usePlasmicQueryData(cacheKey, async () => {
    if (!table) {
      throw new Error(`You must select a table to query`);
    } else if (tables && !tables.find(t => t.identifier === table)) {
      throw new Error(`There is no table called "${table}"`);
    }
    return mkApi(databaseConfig).query(table, params);
  });

  return renderMaybeData<ApiCmsRow[]>(maybeData, rows => (
    <QueryResultProvider table={table!} rows={rows}>
      {children}
    </QueryResultProvider>
  ));
}

interface CmsRowRepeaterProps extends CanvasComponentProps<TablesContextData> {
  children?: React.ReactNode;
  table?: string;
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
      displayName: "Model",
      description: "CMS model (table) to use.",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
    },
  },
};

export function CmsRowRepeater({
  table,
  children,
  setControlContextData,
}: CmsRowRepeaterProps) {
  const tables = useTables();
  if (tables) {
    setControlContextData?.({ tables });
  }

  const res = useQueryResults(table);
  if (!res) {
    return <div>Error: No CMS query result to repeat.</div>;
  }

  return (
    <>
      {res.rows.map((row, index) => (
        <RowProvider table={res.table} row={row}>
          {repeatedElement(index === 0, children)}
        </RowProvider>
      ))}
    </>
  );
}

interface CmsRowFieldProps
  extends CanvasComponentProps<TablesContextData & { table: string }> {
  table?: string;
  field?: string;
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
      displayName: "Model",
      description: "CMS model (table) to use.",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
    },
    field: {
      type: "choice",
      displayName: "Field",
      description: "Field (from model schema) to use.",
      options: ({ table }, ctx) =>
        mkFieldOptions(ctx?.tables, ctx?.table ?? table),
    },
  },
};

export function CmsRowField({
  className,
  table,
  field,
  setControlContextData,
}: CmsRowFieldProps) {
  const tables = useTables();

  const res = useRow(table);
  if (!res || !res.row) {
    return <div>Error: No CMS Row found</div>;
  }

  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({ tables, table: res.table });
  }

  const schema = tables?.find(t => t.identifier === res.table)?.schema;
  const fieldMeta = field
    ? schema?.fields.find(f => f.identifier === field)
    : schema?.fields[0];

  if (!fieldMeta) {
    return <div>Error: No field to display</div>;
  }

  const data = res.row.data?.[fieldMeta.identifier];
  return data ? (
    renderValue(data, fieldMeta.type, {
      className,
    })
  ) : (
    <div>(no data returned)</div>
  );
}

function assertNever(_: never): never {
  throw new Error("unexpected branch taken");
}

function renderValue(value: any, type: CmsType, props: { className?: string }) {
  switch (type) {
    case "number":
    case "boolean":
    case "text":
    case "long-text":
    case "date-time":
      return <div className={props.className}>{value}</div>;
    case "image":
      if (value && typeof value === "object" && value.url && value.imageMeta) {
        return (
          <img
            src={value.url}
            width={value.imageMeta.height}
            height={value.imageMeta.height}
            className={props.className}
          />
        );
      }
      return null;
    default:
      assertNever(type);
  }
}

interface CmsRowLinkProps
  extends CanvasComponentProps<TablesContextData & { table: string }> {
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
      displayName: "Model",
      description: "CMS model (table) to use.",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
    },
    field: {
      type: "choice",
      displayName: "Field",
      description: "Field (from model schema) to use.",
      options: ({ table }, ctx) =>
        mkFieldOptions(ctx?.tables, ctx?.table ?? table),
    },
    hrefProp: {
      type: "string",
      displayName: '"href" prop',
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
  const tables = useTables();

  const res = useRow(table);
  if (!res || !res.row) {
    return <div>Error: No CMS row found</div>;
  }

  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({ tables, table: res.table });
  }

  const schema = tables?.find(t => t.identifier === res.table)?.schema;
  const fieldMeta = field
    ? schema?.fields.find(f => f.identifier === field)
    : schema?.fields.find(f => f.type === "text");

  if (!fieldMeta) {
    return <div>Error: No field to display</div>;
  }

  const value = res.row.data?.[fieldMeta.identifier] || "";
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { [hrefProp]: value });
    }
    return child;
  });

  return <>{childrenWithProps}</>;
}

interface CmsRowLoaderProps extends CanvasComponentProps<TablesContextData> {
  table: string;
  row: string;
  children: React.ReactNode;
  useDraft: boolean;
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
    row: {
      type: "string",
      displayName: "Entry ID",
      description: "Row identifier to query.",
    },
    table: {
      type: "choice",
      displayName: "Model",
      description: "CMS model (table) to query.",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
    },
    useDraft: {
      type: "boolean",
      displayName: "Use drafts?",
      description: "If set, also query unpublished content.",
      defaultValue: false,
    },
  },
};

export function CmsRowLoader({
  table,
  row,
  children,
  useDraft,
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
    useDraft,
  });
  const maybeData = usePlasmicQueryData(cacheKey, async () =>
    mkApi(databaseConfig).fetchRow(table, row, useDraft)
  );
  return renderMaybeData<ApiCmsRow>(maybeData, row => (
    <RowProvider table={table} row={row}>
      {children}
    </RowProvider>
  ));
}
