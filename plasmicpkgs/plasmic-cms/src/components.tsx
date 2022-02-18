import { repeatedElement } from "@plasmicapp/host";
import {
  CanvasComponentProps,
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { usePlasmicQueryData } from "@plasmicapp/query";
import React from "react";
import { DatabaseConfig, HttpError, mkApi, QueryParams } from "./api";
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

interface FetcherComponentProps {
  hideIfNotFound?: boolean;
}

const fetcherComponentPropMetas = {
  hideIfNotFound: {
    type: "boolean",
    defaultValue: false,
    description: "Whether to show an error if no result is found",
  },
} as const;

function renderMaybeData<T>(
  maybeData: ReturnType<typeof usePlasmicQueryData>,
  renderFn: (data: T) => JSX.Element,
  loaderProps: FetcherComponentProps
): React.ReactElement | null {
  if ("error" in maybeData) {
    const error = maybeData.error;
    if (error && error instanceof HttpError && error.status === 404) {
      if (loaderProps.hideIfNotFound) {
        return null;
      } else {
        return <div>Error: Data not found</div>;
      }
    } else {
      return <div>Error: {error?.message}</div>;
    }
  }
  if (!("data" in maybeData)) {
    return <div>Loading...</div>;
  }
  return renderFn(maybeData.data as T);
}

interface CmsCredentialsProviderProps extends DatabaseConfig {
  children?: React.ReactNode;
}

const defaultHost = "https://studio.plasmic.app";

// TODO: Remove `children` from props and make cmsDataProviderMeta a
// ContextMeta.
export const cmsCredentialsProviderMeta: ComponentMeta<CmsCredentialsProviderProps> = {
  name: `${componentPrefix}-credentials-provider`,
  displayName: "CMS Credentials Provider",
  importName: "CmsCredentialsProvider",
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
    locale: {
      type: "string",
      displayName: "Locale",
      description: "The locale to use for localized values, leave empty for the default locale.",
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

export function CmsCredentialsProvider({
  children,
  ...config
}: CmsCredentialsProviderProps) {
  config.host = config.host || defaultHost;
  if (!config.databaseId) {
    throw new Error(`You must specify the CMS database ID to use.`);
  }
  if (!config.projectId) {
    throw new Error(
      `You must specify the project you are using this CMS from.`
    );
  }
  if (!config.projectApiToken) {
    throw new Error(
      `You must specify the token of the project you are using this CMS from.`
    );
  }
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

  return renderMaybeData<ApiCmsTable[]>(
    maybeData,
    (tables) => <TablesProvider tables={tables}>{children}</TablesProvider>,
    { hideIfNotFound: false }
  );
}

type TablesContextData = {
  tables?: ApiCmsTable[];
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
  where,
  useDraft,
  orderBy,
  desc,
  limit,
}: CmsQueryLoaderProps) {
  const databaseConfig = useDatabase();
  const tables = useTables();
  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({ tables });
  }

  const params = { where, useDraft, orderBy, desc, limit };

  const cacheKey = JSON.stringify({
    component: "CmsQueryLoader",
    table,
    databaseConfig,
    params,
  });
  const maybeData = usePlasmicQueryData(cacheKey, async () => {
    if (!table) {
      throw new Error(`You must select a table to query`);
    } else if (tables && !tables.find((t) => t.identifier === table)) {
      throw new Error(`There is no table called "${table}"`);
    }
    return mkApi(databaseConfig).query(table, params);
  });

  return renderMaybeData<ApiCmsRow[]>(
    maybeData,
    (rows) => (
      <QueryResultProvider table={table!} rows={rows}>
        {children}
      </QueryResultProvider>
    ),
    { hideIfNotFound: false }
  );
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
        mkFieldOptions(ctx?.tables, ctx?.table ?? table, [
          "number",
          "boolean",
          "text",
          "long-text",
          "date-time",
          "rich-text",
        ]),
    },
  },
};

export function CmsRowField({
  className,
  table,
  field,
  setControlContextData,
  ...rest
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

  const fieldMeta = deriveInferredTableField({
    table: res.table,
    tables,
    field,
    typeFilters: ["text"],
  });

  if (!fieldMeta) {
    return <div>Error: No field to display</div>;
  }

  const data = res.row.data?.[fieldMeta.identifier];
  return data
    ? renderValue(data, fieldMeta.type, {
        className,
        ...rest,
      })
    : null;
}

const DEFAULT_TYPE_FILTERS = ["text"];
function deriveInferredTableField(opts: {
  table: string;
  tables?: ApiCmsTable[];
  field?: string;
  typeFilters?: CmsType[];
}) {
  const { table, tables, field, typeFilters } = opts;
  const schema = tables?.find((t) => t.identifier === table)?.schema;
  const fieldMeta = field
    ? schema?.fields.find((f) => f.identifier === field)
    : schema?.fields.find((f) =>
        (typeFilters ?? DEFAULT_TYPE_FILTERS).includes(f.type)
      );
  return fieldMeta;
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
      return <div {...props}>{value}</div>;
    case "rich-text":
      return <div dangerouslySetInnerHTML={{__html: value}}{...props}/>;
    case "image":
      if (value && typeof value === "object" && value.url && value.imageMeta) {
        return (
          <img
            src={value.url}
            width={value.imageMeta.height}
            height={value.imageMeta.height}
            {...props}
          />
        );
      }
      return null;
    default:
      assertNever(type);
  }
}

interface TableContextData extends TablesContextData {
  table?: string;
}

interface CmsRowLinkProps extends CanvasComponentProps<TableContextData> {
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
        type: "text",
        tag: "a",
        value: "Link",
      },
    },
    table: {
      type: "choice",
      displayName: "Model",
      description: "CMS model (table) to use.",
      options: (_: any, ctx: TableContextData | null) =>
        mkTableOptions(ctx?.tables),
    },
    field: {
      type: "choice",
      displayName: "Field",
      description: "Field (from model schema) to use.",
      options: ({ table }: CmsRowLinkProps, ctx: TableContextData | null) =>
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
}: CmsRowLinkProps): React.ReactElement | null {
  const tables = useTables();

  const res = useRow(table);
  if (!res || !res.row) {
    return <>{children}</>;
  }

  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({ tables, table: res.table });
  }

  const fieldMeta = deriveInferredTableField({
    table: res.table,
    tables,
    field,
    typeFilters: ["text"],
  });
  if (!fieldMeta) {
    return <>{children}</>;
  }

  if (!children) {
    return null;
  }

  const value = res.row.data?.[fieldMeta.identifier] || "";
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { [hrefProp]: value });
    }
    return child;
  });

  return <>{childrenWithProps ?? null}</>;
}

interface CmsRowImageProps extends CanvasComponentProps<TableContextData> {
  table: string;
  field: string;
  srcProp: string;
  children: React.ReactNode;
}

export const cmsRowImageMeta: ComponentMeta<CmsRowImageProps> = {
  name: `${componentPrefix}-row-image`,
  displayName: "CMS Row Image",
  importName: "CmsRowImage",
  importPath: modulePath,
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "img",
        src: "https://studio.plasmic.app/static/img/placeholder-full.png",
      },
    },
    table: {
      type: "choice",
      displayName: "Model",
      description: "CMS model (table) to use.",
      options: (_: any, ctx: TableContextData | null) =>
        mkTableOptions(ctx?.tables),
    },
    field: {
      type: "choice",
      displayName: "Field",
      description: "Field (from model schema) to use.",
      options: ({ table }: CmsRowImageProps, ctx: TableContextData | null) =>
        mkFieldOptions(ctx?.tables, ctx?.table ?? table),
    },
    srcProp: {
      type: "string",
      displayName: 'Image "src" prop',
      description: "Prop to inject into children",
      defaultValue: "src",
    },
  },
};

export function CmsRowImage({
  table,
  field,
  srcProp,
  children,
  setControlContextData,
}: CmsRowImageProps): React.ReactElement | null {
  const tables = useTables();

  const res = useRow(table);
  if (!res || !res.row) {
    return <>{children}</>;
  }

  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({ tables, table: res.table });
  }

  const fieldMeta = deriveInferredTableField({
    table: res.table,
    tables,
    field,
    typeFilters: ["image"],
  });
  if (!fieldMeta) {
    return <>{children}</>;
  }

  const value = res.row.data?.[fieldMeta.identifier] || "";
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && value) {
      if (typeof value === "object" && value.url && value.imageMeta) {
        return React.cloneElement(child, {
          [srcProp]: {
            src: value.url,
            fullHeight: value.imageMeta.height,
            fullWidth: value.imageMeta.width,
          },
        });
      }
      return React.cloneElement(child, { [srcProp]: value });
    }
    return child;
  });

  return <>{childrenWithProps}</>;
}

interface CmsRowFieldValueProps extends CanvasComponentProps<TableContextData> {
  table: string;
  field: string;
  valueProp: string;
  children: React.ReactNode;
}

export const cmsRowFieldValueMeta: ComponentMeta<CmsRowFieldValueProps> = {
  name: `${componentPrefix}-row-value`,
  displayName: "CMS Row Value",
  importName: "CmsRowValue",
  importPath: modulePath,
  props: {
    children: {
      type: "slot",
    },
    table: {
      type: "choice",
      displayName: "Model",
      description: "CMS model (table) to use.",
      options: (_: any, ctx: TableContextData | null) =>
        mkTableOptions(ctx?.tables),
    },
    field: {
      type: "choice",
      displayName: "Field",
      description: "Field (from model schema) to use.",
      options: (
        { table }: CmsRowFieldValueProps,
        ctx: TableContextData | null
      ) => mkFieldOptions(ctx?.tables, ctx?.table ?? table),
    },
    valueProp: {
      type: "string",
      displayName: "Value prop",
      description: "Prop to inject into children as",
      defaultValue: "children",
    },
  },
};

export function CmsRowFieldValue({
  table,
  field,
  valueProp,
  children,
  setControlContextData,
}: CmsRowFieldValueProps): React.ReactElement | null {
  const tables = useTables();

  const res = useRow(table);
  if (!res || !res.row) {
    return <>{children}</>;
  }

  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({ tables, table: res.table });
  }

  const fieldMeta = deriveInferredTableField({
    table: res.table,
    tables,
    field,
    typeFilters: ["text"],
  });

  if (!fieldMeta) {
    return <>{children}</>;
  }

  const value = res.row.data?.[fieldMeta.identifier] || "";
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { [valueProp]: value });
    }
    return child;
  });

  return <>{childrenWithProps}</>;
}

interface CmsRowLoaderProps
  extends CanvasComponentProps<TablesContextData>,
    FetcherComponentProps {
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
    ...fetcherComponentPropMetas,
  },
};

export function CmsRowLoader({
  table,
  row,
  children,
  useDraft,
  hideIfNotFound,
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
  const maybeData = usePlasmicQueryData(cacheKey, async () => {
    if (!table) {
      throw new Error("You must specify a model to fetch from.");
    }
    if (!row) {
      throw new Error("You must specify an entry name to fetch.");
    }
    return await mkApi(databaseConfig).fetchRow(table, row, useDraft);
  });
  return renderMaybeData<ApiCmsRow>(
    maybeData,
    (row) => (
      <RowProvider table={table} row={row}>
        {children}
      </RowProvider>
    ),
    { hideIfNotFound }
  );
}
