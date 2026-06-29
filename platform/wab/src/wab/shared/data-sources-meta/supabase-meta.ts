import type { DataSource } from "@/wab/server/entities/Entities";
import { DataSourceMeta } from "@/wab/shared/data-sources-meta/data-sources";

export interface SupabaseDataSource extends DataSource {
  source: "supabase";
  credentials: {
    apiKey: string;
  };
  settings: {
    url: string;
  };
}

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
  studioOps: {},
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
  ],
};
