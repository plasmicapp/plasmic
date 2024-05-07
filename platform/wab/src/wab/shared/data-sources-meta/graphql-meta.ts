import type { DataSource } from "@/wab/server/entities/Entities";
import {
  ArgMeta,
  DataSourceMeta,
} from "@/wab/shared/data-sources-meta/data-sources";

const COMMON_ARGS: Record<string, ArgMeta> = {
  query: {
    type: "graphql-query",
    label: "Query",
    layout: "vertical",
  },
  variables: {
    type: "json-schema",
    label: "Variables",
    fields: (schema, tableIdentifier, draft) => draft?.extraState?.fields ?? {},
    requiredFields: (schema, tableIdentifier, draft) =>
      draft?.extraState?.requiredFields ?? {},
    description:
      "Add a variable to your query and you'll be able to populate it here",
  },
  headers: {
    type: "dict-string",
    label: "Headers",
    description: "Headers to send",
  },
};

export const GRAPHQL_META: DataSourceMeta = {
  id: "graphql",
  label: "GraphQL",
  credentials: {},
  settings: {
    commonHeaders: {
      type: "dict",
      label: "Default headers",
      default: {
        "Content-Type": "application/json",
      },
    },
    baseUrl: {
      type: "string",
      label: "Base URL",
      required: true,
      public: true,
    },
  },
  studioOps: {
    query: {
      name: "query",
      // TODO check is this right?
      type: "read",
      label: "Query",
      args: {
        ...COMMON_ARGS,
      },
    },
  },
  ops: [
    {
      name: "query",
      label: "Query",
      type: "read",
      args: {
        ...COMMON_ARGS,
      },
    },
    {
      name: "mutation",
      label: "Mutation",
      type: "write",
      args: {
        ...COMMON_ARGS,
      },
    },
  ],
};

export interface GraphqlDataSource extends DataSource {
  source: "graphql";
  credentials: {};
  settings: {
    commonHeaders?: Record<string, string>;
    baseUrl: string;
  };
}
