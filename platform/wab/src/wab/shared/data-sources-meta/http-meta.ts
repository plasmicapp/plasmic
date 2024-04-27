import type { DataSource } from "@/wab/server/entities/Entities";
import {
  ArgMeta,
  DataSourceMeta,
} from "@/wab/shared/data-sources-meta/data-sources";

const COMMON_ARGS: Record<string, ArgMeta> = {
  path: {
    type: "string",
    label: "Path",
    renderProps: (dataSource) => {
      const baseUrl = dataSource.settings["baseUrl"] as string | undefined;
      return {
        // baseUrl may be undefined now, because we're not sending
        // dataSource.settings to the client anymore except for the
        // data source owner... 😬
        prefix: baseUrl
          ? baseUrl.endsWith("/")
            ? baseUrl
            : `${baseUrl}/`
          : undefined,
        placeholder: "api/example",
      };
    },
  },
  params: {
    type: "dict-string",
    label: "Params",
    description: "Query parameters to send",
  },
  headers: {
    type: "dict-string",
    label: "Headers",
    description: "Headers to send",
  },
};

export const HTTP_META: DataSourceMeta = {
  id: "http",
  label: "Generic HTTP",
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
  studioOps: {},
  ops: [
    {
      name: "get",
      label: "GET",
      type: "read",
      args: {
        ...COMMON_ARGS,
      },
    },
    {
      name: "post",
      label: "POST",
      type: "write",
      args: {
        ...COMMON_ARGS,
        body: {
          type: "http-body",
          label: "Body",
        },
      },
    },
    {
      name: "put",
      label: "PUT",
      type: "write",
      args: {
        ...COMMON_ARGS,
        body: {
          type: "http-body",
          label: "Body",
        },
      },
    },
    {
      name: "delete",
      label: "DELETE",
      type: "write",
      args: {
        ...COMMON_ARGS,
      },
    },
    {
      name: "patch",
      label: "PATCH",
      type: "write",
      args: {
        ...COMMON_ARGS,
        body: {
          type: "http-body",
          label: "Body",
        },
      },
    },
  ],
};

export interface HttpDataSource extends DataSource {
  source: "http";
  credentials: {
    commonHeaders?: Record<string, string>;
  };
  settings: {
    commonHeaders?: Record<string, string>;
    baseUrl: string;
  };
}

export type HttpBodyEncodingType = "raw" | "form" | "json" | "binary";
