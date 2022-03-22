import { repeatedElement } from "@plasmicapp/host";
import {
  CanvasComponentProps,
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { GlobalContextMeta } from "@plasmicapp/host/registerGlobalContext";
import { usePlasmicQueryData } from "@plasmicapp/query";
import dayjs from "dayjs";
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
import { ApiCmsRow, ApiCmsTable, CmsFieldMeta, CmsType } from "./schema";
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
  loaderProps: FetcherComponentProps,
  loadingMessage?: React.ReactNode,
  forceLoadingState?: boolean
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
  if (!("data" in maybeData) || forceLoadingState) {
    return <>{loadingMessage ?? <div>Loading...</div>}</>;
  }
  return renderFn(maybeData.data as T);
}

interface CmsCredentialsProviderProps extends DatabaseConfig {
  children?: React.ReactNode;
}

const defaultHost = "https://studio.plasmic.app";

export const cmsCredentialsProviderMeta: GlobalContextMeta<CmsCredentialsProviderProps> = {
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
      description:
        "The ID of the CMS (database) to use. (Can get on the CMS settings page)",
    },
    databaseToken: {
      type: "string",
      displayName: "CMS Public Token",
      description:
        "The Public Token of the CMS (database) you are using. (Can get on the CMS settings page)",
    },
    locale: {
      type: "string",
      displayName: "Locale",
      description:
        "The locale to use for localized values, leave empty for the default locale.",
    },
  },
};

export function CmsCredentialsProvider({
  children,
  ...config
}: CmsCredentialsProviderProps) {
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
  const maybeData = usePlasmicQueryData(cacheKey, async () => {
    if (!isDatabaseConfigured(databaseConfig)) {
      return [];
    }
    return await mkApi(databaseConfig).fetchTables();
  });

  return renderMaybeData<ApiCmsTable[]>(
    maybeData,
    tables => <TablesProvider tables={tables}>{children}</TablesProvider>,
    { hideIfNotFound: false }
  );
}

type TablesContextData = {
  tables?: ApiCmsTable[];
};
interface TableContextData extends TablesContextData {
  table?: string;
}

interface RowContextData extends TableContextData {
  row: ApiCmsRow;
  fieldMeta?: CmsFieldMeta;
}

interface CmsQueryLoaderProps
  extends QueryParams,
    CanvasComponentProps<TablesContextData> {
  children?: React.ReactNode;
  table?: string;
}

export const cmsQueryLoaderMeta: ComponentMeta<CmsQueryLoaderProps> = {
  name: `${componentPrefix}-query-loader`,
  displayName: "CMS Data Loader",
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

function isDatabaseConfigured(config?: DatabaseConfig) {
  return config?.databaseId && config?.databaseToken;
}

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
    if (!isDatabaseConfigured(databaseConfig)) {
      throw new Error(`You must specify the CMS ID and API key`);
    }
    if (!table) {
      throw new Error(`You must select a model to query`);
    } else if (tables && !tables.find(t => t.identifier === table)) {
      throw new Error(`There is no model called "${table}"`);
    }
    return mkApi(databaseConfig).query(table, params);
  });

  return renderMaybeData<ApiCmsRow[]>(
    maybeData,
    rows => (
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
  displayName: "CMS Entry Repeater",
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

interface CmsQueryRepeaterProps
  extends QueryParams,
    CanvasComponentProps<TableContextData> {
  children?: React.ReactNode;
  table?: string;
  emptyMessage?: React.ReactNode;
  forceEmptyState?: boolean;
  loadingMessage?: React.ReactNode;
  forceLoadingState?: boolean;
}

export const cmsQueryRepeaterMeta: ComponentMeta<CmsQueryRepeaterProps> = {
  name: `${componentPrefix}-query-repeater`,
  displayName: "CMS Data Loader",
  description:
    "Fetches CMS data and repeats content of children once for every row fetched.",
  importName: "CmsQueryRepeater",
  importPath: modulePath,
  props: {
    children: {
      type: "slot",
      isRepeated: true,
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "component",
            name: `${componentPrefix}-row-field`,
          },
        ],
      },
    },
    table: {
      type: "choice",
      displayName: "Model",
      description: "CMS model (table) to query.",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
      defaultValueHint: (_, ctx) => ctx?.table,
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
      hidden: () => true,
    },
    orderBy: {
      type: "choice",
      displayName: "Order by",
      description: "Field to order by.",
      options: (_, ctx) => mkFieldOptions(ctx?.tables, ctx?.table),
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
    emptyMessage: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "No matching entries found.",
      },
    },
    forceEmptyState: {
      type: "boolean",
      displayName: "Force empty state",
      description: "If set, will render as if no matching entries were found.",
      defaultValue: false,
    },
    loadingMessage: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Loading...",
      },
    },
    forceLoadingState: {
      type: "boolean",
      displayName: "Force loading state",
      description:
        "If set, will render as if it is waiting for the query to run.",
      defaultValue: false,
    },
  },
};

export function CmsQueryRepeater({
  table,
  children,
  setControlContextData,
  where,
  useDraft,
  orderBy,
  desc,
  limit,
  emptyMessage,
  forceEmptyState,
  loadingMessage,
  forceLoadingState,
}: CmsQueryRepeaterProps) {
  const databaseConfig = useDatabase();
  const tables = useTables();

  const params = { where, useDraft, orderBy, desc, limit };

  const cacheKey = JSON.stringify({
    component: "CmsQueryLoader",
    table,
    databaseConfig,
    params,
  });

  if (!table && tables && tables.length > 0) {
    table = tables[0].identifier;
  }

  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({ tables, table });
  }

  const maybeData = usePlasmicQueryData(cacheKey, async () => {
    if (!isDatabaseConfigured(databaseConfig)) {
      throw new Error(`You must specify a CMS ID and API key`);
    }
    if (!table) {
      throw new Error(`You must select a model to query`);
    } else if (tables && !tables.find(t => t.identifier === table)) {
      throw new Error(`There is no model called "${table}"`);
    } else {
      return mkApi(databaseConfig).query(table, params);
    }
  });

  return renderMaybeData<ApiCmsRow[]>(
    maybeData,
    rows => {
      if (rows.length === 0 || forceEmptyState) {
        return <> {emptyMessage} </>;
      }
      return (
        <QueryResultProvider table={table!} rows={rows}>
          {rows.map((row, index) => (
            <RowProvider table={table!} row={row}>
              {repeatedElement(index === 0, children)}
            </RowProvider>
          ))}
        </QueryResultProvider>
      );
    },
    { hideIfNotFound: false },
    loadingMessage,
    forceLoadingState
  );
}

interface CmsRowFieldProps extends CanvasComponentProps<RowContextData> {
  table?: string;
  field?: string;
  className?: string;
  dateFormat?: string;
}

export const cmsRowFieldMeta: ComponentMeta<CmsRowFieldProps> = {
  name: `${componentPrefix}-row-field`,
  displayName: "CMS Entry Field",
  importName: "CmsRowField",
  importPath: modulePath,
  props: {
    table: {
      type: "choice",
      displayName: "Model",
      description: "CMS model (table) to use.",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
      defaultValueHint: (_, ctx) => ctx?.table,
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
          "image",
        ]),
      defaultValueHint: (_, ctx) =>
        ctx?.fieldMeta?.name || ctx?.fieldMeta?.identifier,
    },
    dateFormat: {
      type: "choice",
      displayName: "Date Format",
      hidden: ({ field }, ctx) => {
        if (!ctx) {
          return true;
        }
        const { table: tableIdentifier, tables } = ctx;
        const table = tables?.find(t => t.identifier === tableIdentifier);
        if (!table) {
          return true;
        }
        const fieldMeta = table.schema.fields.find(f => f.identifier === field);
        if (!fieldMeta) {
          return true;
        }
        return fieldMeta.type !== "date-time";
      },
      options: [
        {
          label: "July 26, 2014",
          value: "MMMM D, YYYY",
        },
        {
          label: "July 26, 2014 10:02 PM",
          value: "MMMM D, YYYY h:mm A",
        },
        {
          label: "Jul 26, 2014",
          value: "MMM D, YYYY",
        },
        {
          label: "Jul 26, 2014 10:02 PM",
          value: "MMM D, YYYY h:mm A",
        },
        {
          label: "Saturday, July 26, 2014",
          value: "dddd, MMMM D, YYYY",
        },
        {
          label: "7/26/2014",
          value: "M/D/YYYY",
        },
        {
          label: "7/26/2014 10:02 PM",
          value: "M/D/YYYY h:mm A",
        },
        {
          label: "26/7/2014",
          value: "D/M/YYYY",
        },
        {
          label: "26/7/2014 10:02 PM",
          value: "D/M/YYYY h:mm A",
        },
        {
          label: "7/26/14",
          value: "M/D/YY",
        },
        {
          label: "7/26/14 10:02 PM",
          value: "M/D/YY h:mm A",
        },
        {
          label: "26/7/14",
          value: "D/M/YY",
        },
        {
          label: "26/7/14 10:02 PM",
          value: "D/M/YY h:mm A",
        },
      ],
    },
  },
};

export function CmsRowField({
  className,
  table,
  field,
  dateFormat,
  setControlContextData,
  ...rest
}: CmsRowFieldProps) {
  const tables = useTables();

  const res = useRow(table);
  if (!res) {
    return (
      <div className={className}>
        Field {table ?? "Unknown Model"}.{field ?? "Unknown Field"}
      </div>
    );
  }

  if (!res.row) {
    return <div className={className}>Error: No CMS Entry found</div>;
  }

  const fieldMeta = deriveInferredTableField({
    table: res.table,
    tables,
    field,
    typeFilters: ["text", "long-text", "rich-text"],
  });

  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({
      tables,
      table: res.table,
      row: res.row,
      fieldMeta: fieldMeta,
    });
  }

  if (!fieldMeta) {
    throw new Error(`Please select an entry field to display.`);
  }

  let data = res.row.data?.[fieldMeta.identifier];
  if (!data) {
    return null;
  }
  if (fieldMeta.type === "date-time" && dateFormat) {
    data = dayjs(data).format(dateFormat);
  }
  return data
    ? renderValue(data, fieldMeta.type, {
        className,
        ...rest,
      })
    : null;
}

const DEFAULT_TYPE_FILTERS = ["text"];
function deriveInferredTableField(opts: {
  table?: string;
  tables?: ApiCmsTable[];
  field?: string;
  typeFilters?: CmsType[];
}) {
  const { table, tables, field, typeFilters } = opts;
  if (!table) return undefined;
  const schema = tables?.find(t => t.identifier === table)?.schema;
  const fieldMeta = field
    ? schema?.fields.find(f => f.identifier === field)
    : schema?.fields.find(f =>
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
      return <div dangerouslySetInnerHTML={{ __html: value }} {...props} />;
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

interface CmsRowLinkProps extends CanvasComponentProps<RowContextData> {
  table: string;
  field: string;
  hrefProp: string;
  children: React.ReactNode;
  prefix?: string;
  suffix?: string;
}

export const cmsRowLinkMeta: ComponentMeta<CmsRowLinkProps> = {
  name: `${componentPrefix}-row-link`,
  displayName: "CMS Entry Link",
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
      defaultValueHint: (_, ctx) => ctx?.table,
    },
    field: {
      type: "choice",
      displayName: "Field",
      description: "Field (from model schema) to use.",
      options: ({ table }: CmsRowLinkProps, ctx: TableContextData | null) =>
        mkFieldOptions(ctx?.tables, ctx?.table ?? table),
      defaultValueHint: (_, ctx) =>
        ctx?.fieldMeta?.name || ctx?.fieldMeta?.identifier,
    },
    hrefProp: {
      type: "string",
      displayName: '"href" prop',
      description: "Prop to inject into children",
      defaultValue: "href",
    },
    prefix: {
      type: "string",
      displayName: "Optional prefix",
      description: "Prefix to prepend to prop value.",
    },
    suffix: {
      type: "string",
      displayName: "Optional suffix",
      description: "Suffix to append to prop value.",
    },
  },
};

export function CmsRowLink({
  table,
  field,
  hrefProp,
  children,
  setControlContextData,
  prefix,
  suffix,
}: CmsRowLinkProps): React.ReactElement | null {
  const tables = useTables();

  const res = useRow(table);
  if (!res || !res.row) {
    return <>{children}</>;
  }

  const fieldMeta = deriveInferredTableField({
    table: res.table,
    tables,
    field,
    typeFilters: ["text"],
  });

  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({
      tables,
      table: res.table,
      row: res.row,
      fieldMeta: fieldMeta,
    });
  }
  if (!fieldMeta) {
    return <>{children}</>;
  }

  if (!children) {
    return null;
  }

  const value = res.row.data?.[fieldMeta.identifier] || "";
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        [hrefProp]:
          prefix || suffix ? `${prefix || ""}${value}${suffix || ""}` : value,
      });
    }
    return child;
  });

  return <>{childrenWithProps ?? null}</>;
}

interface CmsRowImageProps extends CanvasComponentProps<RowContextData> {
  table: string;
  field: string;
  srcProp: string;
  children: React.ReactNode;
}

export const cmsRowImageMeta: ComponentMeta<CmsRowImageProps> = {
  name: `${componentPrefix}-row-image`,
  displayName: "CMS Entry Image",
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
      defaultValueHint: (_, ctx) => ctx?.table,
    },
    field: {
      type: "choice",
      displayName: "Field",
      description: "Field (from model schema) to use.",
      options: ({ table }: CmsRowImageProps, ctx: TableContextData | null) =>
        mkFieldOptions(ctx?.tables, ctx?.table ?? table, ["image"]),
      defaultValueHint: (_, ctx) =>
        ctx?.fieldMeta?.name || ctx?.fieldMeta?.identifier,
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

  const fieldMeta = deriveInferredTableField({
    table: res.table,
    tables,
    field,
    typeFilters: ["image"],
  });

  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({
      tables,
      table: res.table,
      row: res.row,
      fieldMeta: fieldMeta,
    });
  }

  if (!fieldMeta) {
    return <>{children}</>;
  }

  const value = res.row.data?.[fieldMeta.identifier] || "";
  const childrenWithProps = React.Children.map(children, child => {
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

interface CmsRowFieldValueProps extends CanvasComponentProps<RowContextData> {
  table: string;
  field: string;
  valueProp: string;
  children: React.ReactNode;
}

export const cmsRowFieldValueMeta: ComponentMeta<CmsRowFieldValueProps> = {
  name: `${componentPrefix}-row-value`,
  displayName: "CMS Entry Value",
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
      defaultValueHint: (_, ctx) => ctx?.table,
    },
    field: {
      type: "choice",
      displayName: "Field",
      description: "Field (from model schema) to use.",
      options: (
        { table }: CmsRowFieldValueProps,
        ctx: TableContextData | null
      ) => mkFieldOptions(ctx?.tables, ctx?.table ?? table),
      defaultValueHint: (_, ctx) =>
        ctx?.fieldMeta?.name || ctx?.fieldMeta?.identifier,
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
  ...rest
}: CmsRowFieldValueProps): React.ReactElement | null {
  const tables = useTables();

  const res = useRow(table);
  if (!res || !res.row) {
    return <>{children}</>;
  }

  const fieldMeta = deriveInferredTableField({
    table: res.table,
    tables,
    field,
    typeFilters: ["text"],
  });

  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({
      tables,
      table: res.table,
      row: res.row,
      fieldMeta: fieldMeta,
    });
  }

  if (!fieldMeta) {
    return <>{children}</>;
  }

  const value = res.row.data?.[fieldMeta.identifier] || "";
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { ...rest, [valueProp]: value });
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
    row => (
      <RowProvider table={table} row={row}>
        {children}
      </RowProvider>
    ),
    { hideIfNotFound }
  );
}
