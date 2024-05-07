import type { DataSource } from "@/wab/server/entities/Entities";
import {
  DataSourceMeta,
  FilterArgMeta,
  SortArgMeta,
  TableArgMeta,
} from "@/wab/shared/data-sources-meta/data-sources";
import { capitalizeFirst } from "@/wab/strs";
import { DataSourceSchema } from "@plasmicapp/data-sources";

const TABLE_TYPE: TableArgMeta = {
  type: "table",
  label: "Model",
  required: true,
  options: (data: DataSourceSchema) => {
    return data.tables.map((table) => ({
      label: table.label ?? capitalizeFirst(table.id),
      value: table.id,
    }));
  },
};

const makeFields = (schema: DataSourceSchema, tableIdentifier?: string) => {
  if (!tableIdentifier || !schema) {
    return {};
  }
  const table = schema.tables.find((t) => t.id === tableIdentifier);
  if (!table) {
    return {};
  }
  return Object.fromEntries(
    table.fields
      .filter((field) => field.type !== "unknown")
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

export const PLASMIC_CMS_META: DataSourceMeta = {
  id: "plasmic-cms",
  label: "Plasmic CMS",
  credentials: {
    secretToken: {
      type: "plasmic-cms-token",
      label: "Secret Token",
      description: "Here's how you get it",
      required: true,
      hidden: true,
    },
  },
  settings: {
    cmsId: {
      type: "plasmic-cms-id",
      label: "CMS Name",
      description: "what's that",
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
      name: "getMany",
      label: "Fetch rows",
      type: "read",
      args: {
        resource: TABLE_TYPE,
        filters: FILTER_TYPE,
        sort: SORT_TYPE,
        locale: {
          type: "string",
          label: "Locale",
        },
        limit: {
          type: "number",
          label: "Limit",
        },
      },
    },
    {
      name: "createMany",
      label: "Create rows",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        variables: {
          type: "dict",
          label: "Values",
          required: true,
        },
        publish: {
          type: "boolean",
          label: "Publish",
        },
      },
    },
    {
      name: "publishOne",
      label: "Publish row",
      type: "write",
      args: {
        rowId: {
          type: "string",
          label: "Row ID",
          required: true,
        },
      },
    },
    {
      name: "updateOne",
      label: "Update row",
      type: "write",
      args: {
        rowId: {
          type: "string",
          label: "Row ID",
          required: true,
        },
        variable: {
          type: "dict",
          label: "Values",
          required: true,
        },
        publish: {
          type: "boolean",
          label: "Publish",
        },
      },
    },
    {
      name: "deleteOne",
      label: "Delete row",
      type: "write",
      args: {
        rowId: {
          type: "string",
          label: "Row ID",
          required: true,
        },
      },
    },
  ],
};

export interface PlasmicCMSDataSource extends DataSource {
  source: "plasmic-cms";
  credentials: {
    secretToken: string;
  };
  settings: {
    cmsId: string;
  };
}

const OPERATORS_NOT_AVAILABLE = [
  "not_equal",
  "less",
  "less_or_equal",
  "greater",
  "greater_or_equal",
  "like",
  "not_like",
  "starts_with",
  "ends_with",
  "between",
  "not_between",
  "is_null",
  "is_not_null",
  "is_empty",
  "is_not_empty",
  "select_equals",
  "select_not_equals",
  "select_any_in",
  "select_not_any_in",
  "multiselect_equals",
  "multiselect_not_equals",
  "proximity",
];

export const QueryBuilderPlasmicCMSConfig = {
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
    number: {
      valueSources: ["value"],
      excludeOperators: OPERATORS_NOT_AVAILABLE,
    },
  },
};
