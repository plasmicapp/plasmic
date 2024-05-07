import type { DataSource } from "@/wab/server/entities/Entities";
import {
  BasesArgMeta,
  DataSourceMeta,
  FilterArgMeta,
  JsonSchemaArgMeta,
  JsonSchemaArrayArgMeta,
  LabeledValue,
  MAKE_DEFAULT_STANDARD_QUERIES,
  PAGINATION_TYPE,
  SortArgMeta,
  TableArgMeta,
} from "@/wab/shared/data-sources-meta/data-sources";
import { DataSourceSchema } from "@plasmicapp/data-sources";

export const FAKE_AIRTABLE_FIELD = "__airtable_id";

const BASE_TYPE: BasesArgMeta = {
  type: "base",
  label: "Airtable base ID",
  options: (data: LabeledValue[]) => {
    return data;
  },
  required: true,
};

const TABLE_TYPE: TableArgMeta = {
  type: "table",
  label: "Table name",
  options: (data: DataSourceSchema) => {
    if (!data) {
      return [];
    }
    return data.tables.map((table) => ({
      label: table.label ?? table.id,
      value: table.id,
    }));
  },
  required: true,
};

const makeFields =
  (includeReadOnly: boolean, includeAirtableId?: boolean) =>
  (schema: DataSourceSchema, tableIdentifier?: string) => {
    if (!tableIdentifier || !schema) {
      return {};
    }
    const table = schema.tables.find((t) => t.id === tableIdentifier);
    if (!table) {
      return {};
    }

    return Object.fromEntries(
      table.fields
        .filter((field) =>
          field.id === FAKE_AIRTABLE_FIELD && includeAirtableId != null
            ? includeAirtableId
            : field.type !== "unknown" && (includeReadOnly || !field.readOnly)
        )
        .map((field) => [
          field.id,
          {
            type: field.type,
            label: field.label ?? field.id,
          },
        ])
    );
  };

const FILTER_TYPE: FilterArgMeta = {
  type: "filter[]",
  label: "Filters",
  fields: makeFields(true),
};

const SORT_TYPE: SortArgMeta = {
  type: "sort[]",
  label: "Sort by",
  fields: makeFields(true, false),
};

const CREATE_ROW_TYPE: JsonSchemaArgMeta = {
  type: "json-schema",
  label: "Fields",
  fields: makeFields(false),
  partial: false,
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

const CREATE_ROWS_TYPE: JsonSchemaArrayArgMeta = {
  type: "json-schema[]",
  label: "Fields",
  fields: makeFields(false),
  required: true,
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
  renderProps: (_) => {
    return {
      codeOnly: true,
      expectedValues: "Array of objects that matches the table schema",
    };
  },
};

const UPDATE_BY_ID_ROW_TYPE: JsonSchemaArgMeta = {
  type: "json-schema",
  label: "Field updates",
  fields: makeFields(false, false),
  partial: true,
  required: true,
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

const UPDATE_ROW_TYPE: JsonSchemaArgMeta = {
  type: "json-schema",
  label: "Field updates",
  fields: makeFields(false, true),
  partial: true,
  requiredFields: [FAKE_AIRTABLE_FIELD],
  required: true,
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

const UPDATE_ROWS_TYPE: JsonSchemaArrayArgMeta = {
  type: "json-schema[]",
  label: "Field updates",
  fields: makeFields(false, true),
  partial: true,
  requiredFields: [FAKE_AIRTABLE_FIELD],
  required: true,
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

export const AIRTABLE_META: DataSourceMeta = {
  id: "airtable",
  label: "Airtable",
  credentials: {
    credentials: {
      type: "oauth2",
      label: "Connection",
      required: true,
    },
  },
  settings: {
    baseId: BASE_TYPE,
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
    {
      name: "getList",
      label: "Query for rows",
      type: "read",
      args: {
        resource: TABLE_TYPE,
        filters: FILTER_TYPE,
        sort: SORT_TYPE,
        pagination: PAGINATION_TYPE,
      },
    },
    {
      name: "getMany",
      label: "Fetch rows by IDs",
      type: "read",
      args: {
        resource: TABLE_TYPE,
        ids: {
          type: "string[]",
          label: "Row IDs",
          required: true,
        },
      },
    },
    {
      name: "getOne",
      label: "Fetch row by ID",
      type: "read",
      args: {
        resource: TABLE_TYPE,
        id: {
          type: "string",
          label: "ID",
          required: true,
        },
      },
    },
    {
      name: "create",
      label: "Create row",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        variables: CREATE_ROW_TYPE,
      },
    },
    {
      name: "createMany",
      label: "Create rows",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        variables: CREATE_ROWS_TYPE,
      },
    },
    {
      name: "updateById",
      label: "Update row",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        id: {
          type: "string",
          required: true,
          label: "Airtable ID",
          hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
        },
        variables: UPDATE_BY_ID_ROW_TYPE,
      },
    },
    {
      name: "update",
      label: "Update row",
      type: "write",
      hidden: true,
      args: {
        resource: TABLE_TYPE,
        variables: UPDATE_ROW_TYPE,
      },
    },
    {
      name: "updateMany",
      label: "Update rows",
      type: "write",
      hidden: true,
      args: {
        resource: TABLE_TYPE,
        variables: UPDATE_ROWS_TYPE,
      },
    },
    {
      name: "deleteOne",
      label: "Delete row",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        id: {
          type: "string",
          label: "ID",
          required: true,
        },
      },
    },
    {
      name: "deleteMany",
      label: "Delete rows",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        ids: {
          type: "string[]",
          label: "IDs",
          required: true,
        },
      },
    },
  ],
  standardQueries: {
    getList: MAKE_DEFAULT_STANDARD_QUERIES.getList("getList"),
    getSchema: MAKE_DEFAULT_STANDARD_QUERIES.getSchema("getTableSchema"),
    getOne: MAKE_DEFAULT_STANDARD_QUERIES.getOne("getList"),
    create: MAKE_DEFAULT_STANDARD_QUERIES.create("create"),
    update: MAKE_DEFAULT_STANDARD_QUERIES.create("update"),
  },
};

export interface AirtableDataSource extends DataSource {
  source: "airtable";
  credentials: {
    credentials: string;
  };
  settings: {
    baseId: string;
  };
}

const OPERATORS_NOT_AVAILABLE = [
  "proximity",
  "starts_with",
  "ends_with",
  "is_null",
  "is_not_null",
];

export const QueryBuilderAirtableConfig = {
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
            jsonLogic: (value) => value,
          },
        },
      },
    },
    number: {
      valueSources: ["value"],
      excludeOperators: OPERATORS_NOT_AVAILABLE.filter(
        (v) => v != "is_null" && v != "is_not_null"
      ),
    },
    boolean: {
      valueSources: ["value"],
      excludeOperators: OPERATORS_NOT_AVAILABLE,
    },
  },
};
