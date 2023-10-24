import { repeatedElement, usePlasmicCanvasContext } from "@plasmicapp/host";
import {
  CanvasComponentProps,
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { GlobalContextMeta } from "@plasmicapp/host/registerGlobalContext";
import { usePlasmicQueryData } from "@plasmicapp/query";
import dayjs from "dayjs";
import React from "react";
import { DatabaseConfig, HttpError, QueryParams, mkApi } from "./api";
import {
  CountProvider,
  DatabaseProvider,
  QueryResultProvider,
  RowProvider,
  TablesProvider,
  useCount,
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
  renderFn: (data: T) => JSX.Element | any,
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

const defaultHost = "https://data.plasmic.app";

export const cmsCredentialsProviderMeta: GlobalContextMeta<CmsCredentialsProviderProps> =
  {
    name: `${componentPrefix}-credentials-provider`,
    displayName: "CMS Credentials Provider",
    description: `
Find (or create) your CMS in the [dashboard](https://studio.plasmic.app), and go to its Settings view for the ID and token.

[See tutorial video](https://docs.plasmic.app/learn/plasmic-cms/).`,
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
        advanced: true,
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
  useDraft,
}: CmsCredentialsProviderProps) {
  const config: DatabaseConfig = {
    databaseId,
    databaseToken,
    locale,
    host: host || defaultHost,
    useDraft: useDraft ?? false,
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
  const inEditor = !!usePlasmicCanvasContext();

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
  row?: ApiCmsRow;
  fieldMeta?: CmsFieldMeta;
  data?: object;
}

function isDatabaseConfigured(config?: DatabaseConfig) {
  return config?.databaseId && config?.databaseToken;
}

interface CmsQueryRepeaterProps
  extends QueryParams,
    CanvasComponentProps<TableContextData> {
  children: React.ReactNode;
  table: string;
  emptyMessage?: React.ReactNode;
  forceEmptyState?: boolean;
  loadingMessage?: React.ReactNode;
  forceLoadingState?: boolean;
  noLayout?: boolean;
  noAutoRepeat?: boolean;
  className?: string;
  filterField?: string;
  filterValue?: string;
  mode?: "rows" | "count";
}

export const cmsQueryRepeaterMeta: CodeComponentMeta<CmsQueryRepeaterProps> = {
  name: `${componentPrefix}-query-repeater`,
  displayName: "CMS Data Fetcher",
  description:
    "Fetches CMS data. Repeats `children` slot content for each row fetched. [See tutorial video](https://docs.plasmic.app/learn/plasmic-cms/).",
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
    mode: {
      type: "choice",
      options: [
        { label: "Rows", value: "rows" },
        { label: "Count", value: "count" },
      ],
      defaultValueHint: "rows",
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
          "ref",
          "object"
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
      hidden: (ps) => ps.mode === "count",
    },
    desc: {
      type: "boolean",
      displayName: "Sort descending?",
      description: 'Sort descending by "Order by" field.',
      defaultValue: false,
      hidden: (ps) => ps.mode === "count",
    },
    limit: {
      type: "number",
      displayName: "Limit",
      description: "Maximum number of entries to fetch (0 for unlimited).",
      defaultValue: 0,
      hidden: (ps) => ps.mode === "count",
    },
    offset: {
      type: "number",
      displayName: "Offset",
      description:
        "Skips this number of rows in the result set; used in combination with limit to build pagination",
      hidden: (ps) => ps.mode === "count",
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
    noAutoRepeat: {
      type: "boolean",
      displayName: "No auto-repeat",
      description: "Do not automatically repeat children for every entry.",
      defaultValue: false,
      hidden: (ps) => ps.mode === "count",
    },
  },
};

export function CmsQueryRepeater({
  table,
  children,
  setControlContextData,
  mode,
  where,
  useDraft,
  orderBy,
  desc,
  limit,
  offset,
  emptyMessage,
  forceEmptyState,
  loadingMessage,
  forceLoadingState,
  noLayout,
  noAutoRepeat,
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
  const params = { where, useDraft, orderBy, desc, limit, offset };

  if (!table && tables && tables.length > 0) {
    table = tables[0].identifier;
  }

  const cacheKey = JSON.stringify({
    component: "CmsQueryLoader",
    mode,
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
    } else if (mode === "count") {
      return mkApi(databaseConfig).count(table, params);
    } else {
      return mkApi(databaseConfig).query(table, params);
    }
  });
  const inEditor = !!usePlasmicCanvasContext();
  if (mode === "count") {
    const node = renderMaybeData<number>(
      maybeData,
      () => children,
      { hideIfNotFound: false },
      inEditor,
      loadingMessage,
      forceLoadingState
    );
    return (
      <CountProvider
        table={table}
        count={typeof maybeData?.data === "number" ? maybeData.data : undefined}
      >
        {node}
      </CountProvider>
    );
  } else {
    const node = renderMaybeData<ApiCmsRow[]>(
      maybeData,
      (rows) => {
        if (rows.length === 0 || forceEmptyState) {
          return emptyMessage;
        }

        return noAutoRepeat
          ? children
          : rows.map((row, index) => (
              <RowProvider key={index} table={table!} row={row}>
                {repeatedElement(index, children)}
              </RowProvider>
            ));
      },
      { hideIfNotFound: false },
      inEditor,
      loadingMessage,
      forceLoadingState
    );
    return (
      <QueryResultProvider
        rows={Array.isArray(maybeData?.data) ? maybeData.data : undefined}
        table={table}
      >
        {noLayout ? <> {node} </> : <div className={className}> {node} </div>}
      </QueryResultProvider>
    );
  }
}

interface CmsRowFieldProps extends CanvasComponentProps<RowContextData> {
  table: string;
  field?: string | string[];
  className?: string;
  dateFormat?: string;
}

export const cmsRowFieldMeta: CodeComponentMeta<CmsRowFieldProps> = {
  name: `${componentPrefix}-row-field`,
  displayName: "CMS Entry Field",
  importName: "CmsRowField",
  importPath: modulePath,
  props: {
    table: {
      type: "choice",
      displayName: "Model",
      hidden: (props, ctx: TableContextData | null) =>
        (ctx?.tables?.length ?? 0) <= 1 && !props.table,
      helpText: "Pick model from a CMS Data Fetcher",
      description:
        "Usually not used! Only with multiple CMS Data Loaders, use this to choose which to show. Otherwise, go select the CMS Data Loader if you want to load different data.",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
      defaultValueHint: (_, ctx) => ctx?.table,
    },
    field: {
      type: "dataSelector",
      data: (_, ctx: any) => ctx?.data ?? {},
      displayName: "Field",
      description: "Field to be displayed.",
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
  defaultStyles: {
    objectFit: "cover",
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
  const tables = useTablesWithDataLoaded("rows");
  const res = useRow(tables, table);
  const unknown = (
    <div className={className} {...rest}>
      Field {table ?? "Unknown Model"}.{field ?? "Unknown Field"}
    </div>
  );
  const fieldMeta = res
    ? deriveInferredTableField({
        table: res.table,
        tables,
        field,
        typeFilters: ["text",
        "long-text", "rich-text"],
      })
    : undefined;

    const filteredFields=res && tables ? filterFieldsByType(res.table,tables,[
      "number",
      "boolean",
      "text",
      "long-text",
      "date-time",
      "rich-text",
      "image",
      "file",
      "object"
    ]):undefined
 


  if (tables) {
    // TODO: Only include table if __plasmic_cms_row_{table} exists.
    setControlContextData?.({
      tables,
      ...(res && res.row && res.row.data
        ? {
            table: res.table,
            row: res.row,
            fieldMeta: fieldMeta,
            data: extractFields(res.row.data,filteredFields),
          }
        : {}),
    });
  }

  if (!res) {
    return unknown;
  }

  if (!res.row) {
    return <div className={className}>Error: No CMS Entry found</div>;
  }

  if (!fieldMeta) {
    return unknown;
  }

  if (!field) {
    return <div>Please specify a valid path or select a field.</div>;
  }

  let data:Record<string,any>|null|string = res.row.data

  if (data !== null && typeof data !=='string' && fieldMeta.path) {
    const pathParts = fieldMeta.path.split(".");
    for (const part of pathParts) {
      if (data && typeof data === 'object' && data.hasOwnProperty(part)) {
        data = data[part];
      } else {
        data = null;
        break;
      }
    }
  } else if (data !== null) {
    data = data[fieldMeta.identifier];
  } else {
    data = null;
  }

  if (!data) {
    return null;
  }
  if (fieldMeta.type === "date-time" && dateFormat && typeof data ==='string') {
    data = dayjs(data).format(dateFormat);
  }
  return data
    ? renderValue(data, fieldMeta.type, {
        className,
        ...rest,
      })
    : null;
}

interface CmsCountProps extends CanvasComponentProps<RowContextData> {
  table: string;
  className?: string;
}

export const cmsCountFieldMeta: CodeComponentMeta<CmsCountProps> = {
  name: `${componentPrefix}-count`,
  displayName: "CMS Entries Count",
  importName: "CmsCount",
  importPath: modulePath,
  props: {
    table: {
      type: "choice",
      displayName: "Model",
      hidden: (props, ctx: TableContextData | null) =>
        (ctx?.tables?.length ?? 0) <= 1 && !props.table,
      helpText: "Pick model from a CMS Data Fetcher",
      description:
        "Usually not used! Only with multiple CMS Data Loaders, use this to choose which to show. Otherwise, go select the CMS Data Loader if you want to load different data.",
      options: (_, ctx) => mkTableOptions(ctx?.tables),
      defaultValueHint: (_, ctx) => ctx?.table,
    },
  },
};
export function CmsCount({
  className,
  table,
  setControlContextData,
  ...rest
}: CmsCountProps) {
  const tables = useTablesWithDataLoaded("count");
  const res = useCount(tables, table);
  const unknown = (
    <div className={className} {...rest}>
      Count: {table ?? "Unknown Model"}
    </div>
  );
  if (!res) {
    return unknown;
  }

  if (res.count == null) {
    return null;
  } else {
    return (
      <div className={className} {...rest}>
        {new Intl.NumberFormat().format(res.count)}
      </div>
    );
  }
}

const DEFAULT_TYPE_FILTERS = ["text"];
function deriveInferredTableField(opts: {
  table?: string;
  tables?: any[];
  field?: string | string[]; // Allow for an array of field identifiers
  typeFilters?: string[];
}) {
  const { table, tables, field, typeFilters } = opts;
  if (!table) return undefined;
  const schema = tables?.find((t) => t.identifier === table)?.schema;

  function findFieldInSchema(schema: any, fieldIdentifier: string): any {
    return schema?.fields.find((f: any) => f.identifier === fieldIdentifier);
  }
  if (Array.isArray(field)) {
    if (field.length === 1) {
      return findFieldInSchema(schema, field[0]);
    } else if (field.length === 2) {
      const topLevelField = findFieldInSchema(schema, field[0]);
      if (
        topLevelField &&
        topLevelField.type === "object" &&
        topLevelField.fields
      ) {
        const nestedField = topLevelField?.fields.find(
          (f: any) => f.identifier === field[1]
        );
        return nestedField
          ? { ...nestedField, path: `${field[0]}.${field[1]}` }
          : undefined;
      }
    }
  } else if (typeof field === "string") {
    return findFieldInSchema(schema, field);
  } else {
    return schema?.fields.find((f: any) =>
      (typeFilters ?? DEFAULT_TYPE_FILTERS).includes(f.type)
    );
  }
}

function filterFieldsByType(table: any, tables: any[], types: string[]): any[] | undefined {
  if (!table || !tables) return undefined;
  const schema = tables.find((t) => t.identifier === table)?.schema;

  if (!schema || !schema.fields) return [];

  const filteredFields = [];

  for (const field of schema.fields) {
    if (types.includes(field.type)) {
      const modifiedField = deepClone(field);

      if (field.type === "object" && field.fields) {
        modifiedField.fields = field.fields.filter((f: any) => types.includes(f.type));
      }

      filteredFields.push(modifiedField);
    }
  }

  return filteredFields;
}

function extractFields(data: Record<string, any>, schema: any): Record<string, any> {

  const result: Record<string, any> = {};
  
  schema.forEach((field: any) => {
    const fieldName = field.identifier;
    const fieldType = field.type;
    if (fieldType === "object" && data[fieldName] && field.fields) {
      result[fieldName] = extractFields({ ...data[fieldName] }, field.fields || []);
    } else if (data[fieldName] !== undefined) {
      result[fieldName] = data[fieldName];
    }
  });

  return result;
}

function deepClone(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item: any) => deepClone(item));
  }

  const clonedObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }

  return clonedObj;
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
    case "object":
    case "ref":
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

export const cmsRowLinkMeta: CodeComponentMeta<CmsRowLinkProps> = {
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
      hidden: (props, ctx: TableContextData | null) =>
        (ctx?.tables?.length ?? 0) <= 1 && !props.table,
      helpText: "Pick model from a CMS Data Fetcher",
      description:
        "Usually not used! Only with multiple CMS Data Loaders, use this to choose which to show. Otherwise, go select the CMS Data Loader if you want to load different data.",
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
  const tables = useTablesWithDataLoaded("rows");

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

export const cmsRowImageMeta: CodeComponentMeta<CmsRowImageProps> = {
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
      hidden: (props, ctx: TableContextData | null) =>
        (ctx?.tables?.length ?? 0) <= 1 && !props.table,
      helpText: "Pick model from a CMS Data Fetcher",
      description:
        "Usually not used! Only with multiple CMS Data Loaders, use this to choose which to show. Otherwise, go select the CMS Data Loader if you want to load different data.",
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
  const tables = useTablesWithDataLoaded("rows");

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

export const cmsRowFieldValueMeta: CodeComponentMeta<CmsRowFieldValueProps> = {
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
      hidden: (props, ctx: TableContextData | null) =>
        (ctx?.tables?.length ?? 0) <= 1 && !props.table,
      helpText: "Pick model from a CMS Data Fetcher",
      description:
        "Usually not used! Only with multiple CMS Data Loaders, use this to choose which to show. Otherwise, go select the CMS Data Loader if you want to load different data.",
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
  const tables = useTablesWithDataLoaded("rows");

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
