import type { DataSource } from "@/wab/server/entities/Entities";
import { DataSourceMeta } from "@/wab/shared/data-sources-meta/data-sources";

export const ZAPIER_META: DataSourceMeta = {
  id: "zapier",
  label: "Zapier",
  credentials: {},
  settings: {
    hookUrl: {
      type: "string",
      label: "Zap's webhook URL",
      required: true,
      description: `The webhook URL for Zaps using "Webhooks by Zapier" trigger and "Catch Hook" (or "Catch Raw Hook") events`,
    },
  },
  studioOps: {},
  ops: [
    {
      name: "trigger",
      label: "Trigger",
      type: "write",
      args: {
        body: {
          type: "http-body",
          label: "Body",
        },
        search: {
          type: "dict-string",
          label: "Search params",
        },
      },
    },
  ],
};

export interface ZapierDataSource extends DataSource {
  source: "zapier";
  credentials: {};
  settings: {
    hookUrl: string;
  };
}
