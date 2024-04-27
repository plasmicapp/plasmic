/**
 * This is incomplete. We want more "raw" operations. Included is a sqlalchemy implementation, but unclear that that's a good interface to the data.
 */

import type { DataSource } from "@/wab/server/entities/Entities";
import {
  DataSourceMeta,
  FilterArgMeta,
  JsonSchemaArgMeta,
  PAGINATION_TYPE,
  SortArgMeta,
  TableArgMeta,
} from "@/wab/shared/data-sources-meta/data-sources";
import { capitalizeFirst } from "@/wab/strs";
import { DataSourceSchema } from "@plasmicapp/data-sources";
import moment from "moment/moment";
import SqlString from "sqlstring";

export interface DynamoDbDataSource extends DataSource {
  source: "dynamodb";
  credentials: {
    secretAccessKey: string;
  };
  settings: {
    accessKeyId: string;
    region: string;
  };
}

const TABLE_TYPE: TableArgMeta = {
  type: "table",
  label: "Sheet name",
  options: (data: DataSourceSchema) => {
    return data.tables.map((table) => ({
      label: table.label ?? table.id,
      value: table.id,
    }));
  },
  required: true,
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
      .map((field) => [
        field.id,
        {
          type: field.type,
          label: field.label ?? capitalizeFirst(field.id),
        },
      ])
  );
};

const FILTER_TYPE: FilterArgMeta = {
  type: "filter[]",
  label: "Filters",
  fields: makeFields,
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

const UPDATE_TYPE: JsonSchemaArgMeta = {
  type: "json-schema",
  label: "Field updates",
  fields: makeFields,
  partial: true,
  required: true,
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

export const DYNAMODB_META: DataSourceMeta = {
  id: "dynamodb",
  label: "DynamoDB",
  fieldOrder: ["accessKeyId", "secretAccessKey", "region"],
  credentials: {
    secretAccessKey: {
      type: "string",
      required: true,
    },
  },
  settings: {
    accessKeyId: {
      type: "string",
      required: true,
    },
    region: {
      type: "string",
      required: true,
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
      name: "create",
      label: "Create row",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        variables: CREATE_TYPE,
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
  ],
};

const OPERATORS_NOT_AVAILABLE = [
  "proximity",
  "starts_with",
  "ends_with",
  // LIKE doesn't currently work: https://github.com/betodealmeida/shillelagh/issues/376
  "like",
  "not_like",
];

export const QueryBuilderDynamoDbConfig = {
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
                return SqlString.escape(dateVal.toDate());
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
