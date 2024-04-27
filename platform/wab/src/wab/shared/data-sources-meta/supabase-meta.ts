import type { DataSource } from "@/wab/server/entities/Entities";
import {
  DataSourceMeta,
  FilterArgMeta,
  SortArgMeta,
  TableArgMeta,
} from "@/wab/shared/data-sources-meta/data-sources";
import { capitalizeFirst } from "@/wab/strs";
import { DataSourceSchema } from "@plasmicapp/data-sources";
import { camelCase } from "lodash";

export interface SupabaseDataSource extends DataSource {
  source: "supabase";
  credentials: {
    apiKey: string;
  };
  settings: {
    url: string;
  };
}

const TABLE_TYPE: TableArgMeta = {
  type: "table",
  label: "Table",
  required: true,
  options: (schema: DataSourceSchema) => {
    return schema.tables.map((table) => ({
      value: table.id,
      label: capitalizeFirst(camelCase(table.id)),
    }));
  },
};

const makeFields = (schema: DataSourceSchema, tableId?: string) => {
  const table = tableId
    ? schema.tables.find((t) => t.id === tableId)
    : undefined;
  if (table) {
    return Object.fromEntries(
      table.fields
        .filter((field) => field.type !== "unknown")
        .map((field) => [
          field.id,
          {
            type: field.type,
            label: capitalizeFirst(camelCase(field.id)),
          },
        ])
    );
  }
  return {};
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

export const SUPABASE_META: DataSourceMeta = {
  id: "supabase",
  label: "Supabase Storage",
  credentials: {
    apiKey: {
      type: "string",
      label: "API Key",
      required: true,
      description: `The "service_role" secret API key for your Supabase`,
    },
  },
  settings: {
    url: {
      type: "string",
      label: "Supabase URL",
      required: true,
      description: "The REST endpoint for querying your Supabase",
    },
  },
  studioOps: {
    // schemaOp: {
    //   name: "getSchema",
    //   type: "read",
    //   args: {},
    // },
  },
  ops: [
    {
      name: "uploadFile",
      label: "Upload file",
      type: "write",
      args: {
        bucket: {
          type: "string",
          label: "Bucket",
          required: true,
        },
        path: {
          type: "string",
          label: "File path",
          required: true,
        },
        content: {
          type: "string",
          label: "Content (Base64-encoded)",
          required: true,
        },
        contentType: {
          type: "string",
          label: "Content type",
          description: "MIME type for the file content",
          required: true,
        },
        upsert: {
          type: "boolean",
          label: "Overwrite existing content?",
          description:
            "If set, if there's already a file with this path, then that file content is overwritten with this one",
        },
      },
    },
    {
      name: "getSignedFileUrl",
      label: "Get URL of uploaded file",
      type: "read",
      args: {
        bucket: {
          type: "string",
          label: "Bucket",
          required: true,
        },
        path: {
          type: "string",
          label: "File path",
          required: true,
        },
        expiresIn: {
          type: "number",
          label: "Expires in (seconds)",
          description:
            "Number of seconds this url is good for before it expires",
          required: true,
        },
        download: {
          type: "boolean",
          label: "Download as file?",
          description: "Clicking this links downloads the file",
        },
      },
    },
    // {
    //   name: "getMany",
    //   label: "Fetch rows by IDs",
    //   type: "read",
    //   args: {
    //     resource: TABLE_TYPE,
    //     ids: {
    //       type: "string[]",
    //       label: "Row IDs",
    //       required: true,
    //     },
    //   },
    // },
    // {
    //   name: "getList",
    //   label: "Query for rows",
    //   type: "read",
    //   args: {
    //     resource: TABLE_TYPE,
    //     filters: FILTER_TYPE,
    //     sort: SORT_TYPE,
    //   },
    // },
    // {
    //   name: "getOne",
    //   label: "Fetch row by ID",
    //   type: "read",
    //   args: {
    //     resource: TABLE_TYPE,
    //     id: {
    //       type: "string",
    //       label: "ID",
    //       required: true,
    //     },
    //   },
    // },
    // {
    //   name: "create",
    //   label: "Create row",
    //   type: "write",
    //   args: {
    //     resource: TABLE_TYPE,
    //     variables: {
    //       type: "dict",
    //       label: "Values",
    //       required: true,
    //     },
    //   },
    // },
    // {
    //   name: "createMany",
    //   label: "Create rows",
    //   type: "write",
    //   args: {
    //     resource: TABLE_TYPE,
    //     variables: {
    //       type: "dict[]",
    //       label: "Values",
    //       required: true,
    //     },
    //   },
    // },
    // {
    //   name: "updateOne",
    //   label: "Update row",
    //   type: "write",
    //   args: {
    //     resource: TABLE_TYPE,
    //     variables: {
    //       type: "dict",
    //       label: "Values",
    //       required: true,
    //     },
    //   },
    // },
    // {
    //   name: "updateMany",
    //   label: "Update rows",
    //   type: "write",
    //   args: {
    //     resource: TABLE_TYPE,
    //     variables: {
    //       type: "dict[]",
    //       label: "Values",
    //       required: true,
    //     },
    //   },
    // },
    // {
    //   name: "deleteOne",
    //   label: "Delete row",
    //   type: "write",
    //   args: {
    //     resource: TABLE_TYPE,
    //     id: {
    //       type: "string",
    //       label: "ID",
    //       required: true,
    //     },
    //   },
    // },
    // {
    //   name: "deleteMany",
    //   label: "Delete rows",
    //   type: "write",
    //   args: {
    //     resource: TABLE_TYPE,
    //     ids: {
    //       type: "string[]",
    //       label: "IDs",
    //       required: true,
    //     },
    //   },
    // },
  ],
};

const OPERATORS_NOT_AVAILABLE = ["proximity"];

export const QueryBuilderSupabaseConfig = {
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
