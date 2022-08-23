import { PlasmicCanvasContext, repeatedElement } from "@plasmicapp/host";
import {
  CanvasComponentProps,
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { GlobalContextMeta } from "@plasmicapp/host/registerGlobalContext";
import { usePlasmicQueryData } from "@plasmicapp/query";
import dayjs from "dayjs";
import React, { useContext } from "react";
import { DatabaseConfig, HttpError, mkApi, QueryParams } from "./api";
import {
  DatabaseProvider,
  QueryResultProvider,
  RowProvider,
  TablesProvider,
  useDatabase,
  useRow,
  useTables,
  useTablesWithDataLoaded,
} from "./context";
import { ApiCmsRow, ApiCmsTable, CmsFieldMeta, CmsType } from "./schema";
import { mkFieldOptions, mkTableOptions } from "./util";

const modulePath = "@plasmicpkgs/plasmic-cms";
const componentPrefix = "hostless-plasmic-cms";

interface FetcherComponentProps {
  hideIfNotFound?: boolean;
}

function renderMaybeData<T>(
  maybeData: ReturnType<typeof usePlasmicQueryData>,
  renderFn: (data: T) => JSX.Element,
  loaderProps: FetcherComponentProps,
  inEditor: boolean,
  loadingMessage?: React.ReactNode,
  forceLoadingState?: boolean
): React.ReactElement | null {
  if ("error" in maybeData) {
    const error = maybeData.error;
    if (!inEditor) {
      return <>{loadingMessage ?? <div>Loading...</div>}</>;
    }
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

export const cmsCredentialsProviderMeta: GlobalContextMeta<CmsCredentialsProviderProps> =
  {
    name: `${componentPrefix}-credentials-provider`,
    displayName: "CMS Credentials Provider",
    description: `
Find your CMS in the [dashboard](https://studio.plasmic.app), and go to the Settings tab for the ID and token.

See also the [getting started video](https://www.youtube.com/watch?v=-Rrn92VtRBc).`,
    importName: "CmsCredentialsProvider",
    importPath: modulePath,
    providesData: true,
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
  databaseId,
  databaseToken,
  host,
  locale,
}: CmsCredentialsProviderProps) {
  const config: DatabaseConfig = {
    databaseId,
    databaseToken,
    locale,
    host: host || defaultHost,
  };
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
  const inEditor = !!useContext(PlasmicCanvasContext);

  return (
    <TablesProvider tables={maybeData.data}>
      {inEditor && maybeData.error ? (
        <div>CMS Error: {maybeData.error.message}</div>
      ) : (
        children
      )}
    </TablesProvider>
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

function isDatabaseConfigured(config?: DatabaseConfig) {
  return config?.databaseId && config?.databaseToken;
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
  noLayout?: boolean;
  className?: string;
  filterField?: string;
  filterValue?: string;
}

export const cmsQueryRepeaterMeta: ComponentMeta<CmsQueryRepeaterProps> = {
  name: `${componentPrefix}-query-repeater`,
  displayName: "CMS Data Loader",
  description:
    "Fetches CMS data and repeats content of children once for every row fetched.",
  importName: "CmsQueryRepeater",
  importPath: modulePath,
  providesData: true,
  defaultStyles: {
    display: "flex",
    width: "stretch",
    maxWidth: "100%",
    flexDirection: "column",
  },
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
      hidden: () => true,
    },
    where: {
      type: "object",
      displayName: "Filter",
      description: "Filter clause, in JSON format.",
      hidden: () => true,
    },
    filterField: {
      type: "choice",
      displayName: "Filter field",
      description: "Field (from model schema) to filter by",
      options: ({ table }, ctx) =>
        mkFieldOptions(ctx?.tables, ctx?.table ?? table, [
          "number",
          "boolean",
          "text",
          "long-text",
        ]),
    },
    filterValue: {
      type: "string",
      displayName: "Filter value",
      description: "Value to filter by, should be of filter field type",
    },
    orderBy: {
      type: "choice",
      displayName: "Order by",
      description: "Field to order by.",
      options: (_, ctx) =>
        mkFieldOptions(ctx?.tables, ctx?.table, [
          "number",
          "boolean",
          "date-time",
          "long-text",
          "text",
        ]),
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
        value: "No matching published entries found.",
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
    noLayout: {
      type: "boolean",
      displayName: "No layout",
      description:
        "When set, CMS Data Loader will not layout its children; instead, the layout set on its parent element will be used. Useful if you want to set flex gap or control container tag type.",
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
  noLayout,
  className,
  filterField,
  filterValue,
}: CmsQueryRepeaterProps) {
  const databaseConfig = useDatabase();
  const tables = useTables();

  if (filterField && filterValue) {
    where = {
      [filterField]: filterValue,
    };
  }
  const params = { where, useDraft, orderBy, desc, limit };

  if (!table && tables && tables.length > 0) {
    table = tables[0].identifier;
  }

  const cacheKey = JSON.stringify({
    component: "CmsQueryLoader",
    table,
    databaseConfig,
    params,
  });

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
    } else if (tables && !tables.find((t) => t.identifier === table)) {
      throw new Error(`There is no model called "${table}"`);
    } else {
      return mkApi(databaseConfig).query(table, params);
    }
  });
  const inEditor = !!useContext(PlasmicCanvasContext);

  const node = renderMaybeData<ApiCmsRow[]>(
    maybeData,
    (rows) => {
      if (rows.length === 0 || forceEmptyState) {
        return (
          <QueryResultProvider table={table!} rows={rows}>
            {emptyMessage}
          </QueryResultProvider>
        );
      }
      return (
        <QueryResultProvider table={table!} rows={rows}>
          {rows.map((row, index) => (
            <RowProvider table={table!} row={row}>
              {repeatedElement(index, children)}
            </RowProvider>
          ))}
        </QueryResultProvider>
      );
    },
    { hideIfNotFound: false },
    inEditor,
    loadingMessage,
    forceLoadingState
  );
  return noLayout ? <> {node} </> : <div className={className}> {node} </div>;
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
          "file",
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
        const table = tables?.find((t) => t.identifier === tableIdentifier);
        if (!table) {
          return true;
        }
        const fieldMeta = table.schema.fields.find(
          (f) => f.identifier === field
        );
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
  const tables = useTablesWithDataLoaded();

  const res = useRow(tables, table);
  const unknown = (
    <div className={className} {...rest}>
      Field {table ?? "Unknown Model"}.{field ?? "Unknown Field"}
    </div>
  );
  if (!res) {
    return unknown;
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
    return unknown;
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
      return (
        <div
          dangerouslySetInnerHTML={{ __html: value }}
          style={{ whiteSpace: "normal" }}
          {...props}
        />
      );
    case "image":
      if (value && typeof value === "object" && value.url && value.imageMeta) {
        return (
          <img
            src={value.url}
            width={value.imageMeta.width}
            height={value.imageMeta.height}
            style={{ objectFit: "cover" }}
            {...props}
          />
        );
      }
      return null;
    case "file":
      if (value && typeof value === "object" && value.url && value.name) {
        return (
          <a href={value.url} target="_blank" {...props}>
            {value.name}
          </a>
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
      hidden: (_, ctx) => ctx?.fieldMeta?.type === "file",
    },
    suffix: {
      type: "string",
      displayName: "Optional suffix",
      description: "Suffix to append to prop value.",
      hidden: (_, ctx) => ctx?.fieldMeta?.type === "file",
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
  const tables = useTablesWithDataLoaded();

  const res = useRow(tables, table);
  if (!res || !res.row) {
    return <>{children}</>;
  }

  const fieldMeta = deriveInferredTableField({
    table: res.table,
    tables,
    field,
    typeFilters: ["file", "text"],
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
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        [hrefProp]:
          fieldMeta.type === "file"
            ? value.url
            : prefix || suffix
            ? `${prefix || ""}${value}${suffix || ""}`
            : value,
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
  const tables = useTablesWithDataLoaded();

  const res = useRow(tables, table);
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

interface CmsRowFieldValueProps extends CanvasComponentProps<RowContextData> {
  table: string;
  field: string;
  valueProp: string;
  children: React.ReactNode;
}

export const cmsRowFieldValueMeta: ComponentMeta<CmsRowFieldValueProps> = {
  name: `${componentPrefix}-row-value`,
  displayName: "CMS Entry Value",
  importName: "CmsRowFieldValue",
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
  const tables = useTablesWithDataLoaded();

  const res = useRow(tables, table);
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
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { ...rest, [valueProp]: value });
    }
    return child;
  });

  return <>{childrenWithProps}</>;
}
