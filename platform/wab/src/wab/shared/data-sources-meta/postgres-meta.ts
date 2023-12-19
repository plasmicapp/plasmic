import { xGroupBy } from "@/wab/common";
import type { DataSource } from "@/wab/server/entities/Entities";
import { capitalizeFirst } from "@/wab/strs";
import { DataSourceSchema } from "@plasmicapp/data-sources";
import moment from "moment";
import SqlString from "sqlstring";
import {
  DataSourceMeta,
  FilterArgMeta,
  JsonSchemaArgMeta,
  JsonSchemaArrayArgMeta,
  LabeledValueGroup,
  MAKE_DEFAULT_STANDARD_QUERIES,
  PAGINATION_TYPE,
  SortArgMeta,
  TableArgMeta,
} from "./data-sources";

export interface PostgresDataSource extends DataSource {
  source: "postgres";
  credentials: {
    connectionString?: string;
    password?: string;
  };
  settings: {
    host?: string;
    port?: string;
    name?: string;
    user?: string;
    connectionOptions?: Record<string, string>;
  };
}

const TABLE_TYPE: TableArgMeta = {
  type: "table",
  label: "Table",
  required: true,
  options: (schemaData: DataSourceSchema): LabeledValueGroup[] => {
    if (!schemaData) {
      return [];
    }
    return [
      ...xGroupBy(schemaData.tables, (table) => {
        if (table.id.includes(`"."`)) {
          return table.id.split(`"."`)[0];
        } else {
          return "";
        }
      }).entries(),
    ]
      .filter(([schemaName]) => schemaName !== "")
      .map(([schemaName, tables]) => {
        return {
          label: schemaName,
          values: tables
            .map((v) => ({
              label: v.label ?? capitalizeFirst(v.id),
              value: v.id,
            }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        };
      })
      .sort((a, b) => {
        // Sort "public" schema first
        if (a.label === "public") {
          return -1;
        } else if (b.label === "public") {
          return 1;
        } else {
          return a.label.localeCompare(b.label);
        }
      });
  },
};

const makeFields = (schemaData: DataSourceSchema, tableId?: string) => {
  if (!tableId) {
    return {};
  }
  const table = schemaData.tables.find((t) => t.id === tableId);
  if (!table) {
    return {};
  }
  return Object.fromEntries(
    table.fields
      .filter((field) => field.type !== "unknown")
      .sort((a, b) => {
        // Sort fields without labels last
        if (a.label === undefined) {
          return 1;
        } else if (b.label === undefined) {
          return -1;
        } else {
          return a.label.localeCompare(b.label);
        }
      })
      .map((field) => {
        const fieldSettings =
          field.type === "enum"
            ? {
                listValues: (field.options ?? []).map((o) => ({
                  value: o,
                  title: o,
                })),
                allowCustomValues: true,
              }
            : undefined;
        return [
          field.id,
          {
            type: field.type,
            label: field.label ?? capitalizeFirst(field.id),
            fieldSettings,
          },
        ];
      })
  );
};

const FILTER_TYPE: FilterArgMeta = {
  type: "filter[]",
  label: "Filters",
  fields: makeFields,
  isSql: true,
  isParamString: true,
};

const SORT_TYPE: SortArgMeta = {
  type: "sort[]",
  label: "Sort by",
  fields: makeFields,
};

const CREATE_TYPE: JsonSchemaArgMeta = {
  type: "json-schema",
  label: "Fields",
  fields: makeFields,
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

const CREATE_MANY_TYPE: JsonSchemaArrayArgMeta = {
  type: "json-schema[]",
  label: "Fields",
  fields: makeFields,
  required: true,
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

const UPDATE_TYPE: JsonSchemaArgMeta = {
  type: "json-schema",
  label: "Field updates",
  fields: makeFields,
  partial: true,
  required: true,
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

const PRIMARY_KEY_TYPE: JsonSchemaArgMeta = {
  type: "json-schema",
  label: "Primary key",
  hideInputToggle: true,
  layout: "vertical",
  showAsIndentedRow: true,
  requiredFields: (schema, tableIdentifier) => {
    if (!schema) {
      return [];
    }
    const table = schema.tables.find((t) => t.id === tableIdentifier);
    if (!table) {
      return [];
    }
    return table.fields
      .filter((field) => field.primaryKey)
      .map((field) => field.id);
  },
  fields: (schema, tableIdentifier) => {
    if (!schema) {
      return {};
    }
    const table = schema.tables.find((t) => t.id === tableIdentifier);
    if (!table) {
      return {};
    }
    return Object.fromEntries(
      table.fields
        .filter((field) => field.primaryKey)
        .map((field) => [
          field.id,
          {
            type: field.type,
            label: field.label ?? capitalizeFirst(field.id),
          },
        ])
    );
  },
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

export const POSTGRES_META: DataSourceMeta = {
  id: "postgres",
  label: "Postgres",
  fieldOrder: ["host", "port", "name", "user", "password", "connectionOptions"],
  credentials: {
    password: {
      type: "string",
      label: "Password",
      placeholder: "Database password",
      required: true,
    },
  },
  settings: {
    host: {
      type: "string",
      label: "Host",
      placeholder: "my.postgresql.host.com",
      required: true,
    },
    port: { type: "string", label: "Port", default: 5432, required: true },
    name: {
      type: "string",
      label: "Database name",
      placeholder: "Database name",
      required: true,
    },
    user: {
      type: "string",
      label: "User",
      placeholder: "Database user",
      required: true,
    },
    connectionOptions: {
      type: "dict",
      label: "Connection options",
    },
  },
  studioOps: {
    schemaOp: {
      name: "getSchema",
      type: "read",
      args: {},
    },
  },
  ops: [
    {
      name: "getTableSchema",
      label: "Query for Schema",
      type: "read",
      args: { resource: TABLE_TYPE },
      hidden: true,
    },
    /**
     * Deprecated - this was misnamed, and it matters because getList is the generic query operation name across all data sources.
     */
    {
      name: "getMany",
      label: "Fetch rows",
      type: "read",
      args: {
        resource: TABLE_TYPE,
        filters: FILTER_TYPE,
        sort: { ...SORT_TYPE, isSql: true, isParamString: true },
        pagination: PAGINATION_TYPE,
      },
      hidden: true,
    },
    {
      name: "getList",
      label: "Query for rows",
      type: "read",
      args: {
        resource: TABLE_TYPE,
        filters: FILTER_TYPE,
        sort: { ...SORT_TYPE, isSql: true, isParamString: true },
        pagination: PAGINATION_TYPE,
      },
    },
    {
      name: "getOne",
      label: "Fetch row by primary key",
      type: "read",
      args: {
        resource: TABLE_TYPE,
        keys: PRIMARY_KEY_TYPE,
      },
    },
    {
      name: "create",
      label: "Create row",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        variables: CREATE_TYPE,
      },
    },
    {
      name: "createMany",
      label: "Create rows",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        variables: CREATE_MANY_TYPE,
      },
    },
    {
      name: "updateById",
      label: "Update row by primary key",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        keys: PRIMARY_KEY_TYPE,
        variables: UPDATE_TYPE,
      },
    },
    {
      name: "updateMany",
      label: "Update rows",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        conditions: { ...FILTER_TYPE, required: true },
        variables: UPDATE_TYPE,
      },
    },
    {
      name: "deleteMany",
      label: "Delete rows",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        conditions: { ...FILTER_TYPE, required: true },
      },
    },
    {
      name: "customRead",
      label: "Custom SQL query to fetch rows",
      type: "read",
      args: {
        query: {
          type: "string",
          label: "Query",
          required: true,
          isSql: true,
          isParamString: true,
        },
      },
    },
    {
      name: "customWrite",
      label: "Custom SQL query for write operations",
      type: "write",
      args: {
        query: {
          type: "string",
          label: "Query",
          required: true,
          isSql: true,
          isParamString: true,
        },
      },
    },
  ],
  standardQueries: {
    getList: MAKE_DEFAULT_STANDARD_QUERIES.getList("getMany"),
    getSchema: MAKE_DEFAULT_STANDARD_QUERIES.getSchema("getTableSchema"),
    getOne: MAKE_DEFAULT_STANDARD_QUERIES.getOne("getMany"),
    create: MAKE_DEFAULT_STANDARD_QUERIES.create("create"),
    update: MAKE_DEFAULT_STANDARD_QUERIES.update("updateMany"),
  },
};

const OPERATORS_NOT_AVAILABLE = ["proximity", "starts_with", "ends_with"];

export const QueryBuilderPostgresConfig = {
  types: {
    text: {
      valueSources: ["value"],
      excludeOperators: OPERATORS_NOT_AVAILABLE,
    },
    datetime: {
      valueSources: ["value"],
      excludeOperators: OPERATORS_NOT_AVAILABLE,
      widgets: {
        datetime: {
          widgetProps: {
            timeFormat: "HH:mm:ss",
            dateFormat: "YYYY-MM-DD",
            valueFormat: "YYYY-MM-DDTHH:mm:ss",
            sqlFormatValue: (val, _, wgtDef) => {
              // If it's not a string, it's a dynamic value and we should keep it
              if (typeof val === "string") {
                const dateVal = moment(val, wgtDef.valueFormat);
                if (dateVal.toString() === "Invalid date") {
                  return val;
                }
                return SqlString.escape(dateVal.format(wgtDef.valueFormat));
              }
              return val;
            },
          },
        },
      },
    },
    date: {
      valueSources: ["value"],
      excludeOperators: OPERATORS_NOT_AVAILABLE,
      widgets: {
        date: {
          widgetProps: {
            dateFormat: "YYYY-MM-DD",
            valueFormat: "YYYY-MM-DD",
            sqlFormatValue: (val, _, wgtDef) => {
              // If it's not a string, it's a dynamic value and we should keep it
              if (typeof val === "string") {
                const dateVal = moment(val, wgtDef.valueFormat);
                if (dateVal.toString() === "Invalid date") {
                  return val;
                }
                return SqlString.escape(dateVal.format(wgtDef.valueFormat));
              }
              return val;
            },
          },
        },
      },
    },
    number: {
      valueSources: ["value"],
      excludeOperators: OPERATORS_NOT_AVAILABLE,
    },
    boolean: {
      valueSources: ["value"],
      excludeOperators: OPERATORS_NOT_AVAILABLE,
    },
  },
};
