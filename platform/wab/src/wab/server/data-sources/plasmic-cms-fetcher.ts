import { ensure, withoutNils } from "@/wab/shared/common";
import {
  ApiCmsDatabase,
  ApiCmsQuery,
  ApiCmsTable,
  ApiCmsWriteRow,
} from "@/wab/shared/ApiSchema";
import {
  buildQueryBuilderConfig,
  Filters,
} from "@/wab/shared/data-sources-meta/data-sources";
import {
  PlasmicCMSDataSource,
  QueryBuilderPlasmicCMSConfig,
} from "@/wab/shared/data-sources-meta/plasmic-cms-meta";
import { getPublicUrl } from "@/wab/shared/urls";
import type { CrudSorting } from "@pankod/refine-core";
import {
  DataSourceSchema,
  ManyRowsResult,
  SingleRowResult,
  TableFieldSchema,
  TableSchema,
} from "@plasmicapp/data-sources";
import { Config, Utils as QbUtils } from "@react-awesome-query-builder/antd";
import fetch from "node-fetch";

export function makePlasmicCMSFetcher(source: PlasmicCMSDataSource) {
  return new PlasmicCMSFetcher(source);
}

export class PlasmicCMSFetcher {
  constructor(private source: PlasmicCMSDataSource) {}

  async getSchema(): Promise<DataSourceSchema> {
    const data = await this.getDatabase();

    if (!data || !data.tables) {
      return { tables: [] };
    }
    return {
      tables: data.tables.map((table: ApiCmsTable) => toTableSchema(table)),
    };
  }

  async getResourceSchema(resource: string) {
    const schema = await this.getSchema();
    return ensure(
      schema.tables.find((t) => t.id === resource),
      `Unknown resource ${resource}`
    );
  }

  async getMany(opts: {
    resource: string;
    filters?: Filters;
    locale?: string;
    draft?: boolean;
    sort?: CrudSorting;
    limit?: number;
  }) {
    const config = opts.filters
      ? buildQueryBuilderConfig(
          QueryBuilderPlasmicCMSConfig,
          opts.filters.fields
        )
      : undefined;
    const where =
      opts.filters && (opts.filters.logic || opts.filters.tree)
        ? QbUtils.mongodbFormat(
            opts.filters.tree
              ? QbUtils.loadTree(opts.filters.tree)
              : (QbUtils.loadFromJsonLogic(
                  opts.filters.logic,
                  config as Config
                ) as any),
            config as Config
          )
        : undefined;
    const limit = typeof opts.limit === "number" ? opts.limit : undefined;
    const sort = opts.sort != null ? opts.sort : undefined;
    const cmsQueryObject: ApiCmsQuery = {
      ...(where != null ? { where } : {}),
      ...(limit != null ? { limit } : {}),
      ...(sort != null
        ? { order: sort.map((v) => ({ field: v.field, dir: v.order })) }
        : {}),
    };
    const filters = JSON.stringify(cmsQueryObject);
    const apiUrl = new URL(
      `${getPublicUrl()}/api/v1/cms/databases/${
        this.source.settings.cmsId
      }/tables/${opts.resource}/query`
    );
    apiUrl.search = new URLSearchParams({
      q: filters,
      locale: opts.locale ?? "",
      draft: opts?.draft ? "1" : "",
    }).toString();
    const res = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        ...this.makeAuthHeader(),
      },
    });
    const data = (await res.json()) as { rows: ApiCmsWriteRow[] };
    return this.processManyRowsResult(opts.resource, data.rows, opts);
  }

  async createMany(opts: {
    resource: string;
    variables: Record<string, any>[];
    publish?: boolean;
  }) {
    const apiUrl = new URL(
      `${getPublicUrl()}/api/v1/cms/databases/${
        this.source.settings.cmsId
      }/tables/${opts.resource}/rows`
    );
    if (opts.publish === true) {
      apiUrl.search = new URLSearchParams({
        publish: "1",
      }).toString();
    }
    const res = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: {
        ...this.makeAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rows: opts.variables }),
    });
    const data = (await res.json()) as { rows: ApiCmsWriteRow[] };
    return this.processManyRowsResult(opts.resource, data.rows, {
      ...opts,
      draft: !opts.publish,
    });
  }

  async publishOne(opts: { rowId: string }) {
    const res = await fetch(
      `${getPublicUrl()}/api/v1/cms/rows/${opts.rowId}/publish`,
      {
        method: "POST",
        headers: {
          ...this.makeAuthHeader(),
        },
      }
    );
    const row = (await res.json()) as ApiCmsWriteRow;
    return this.processSingleRowResult(row);
  }

  async updateOne(opts: {
    rowId: string;
    variable: Record<string, any>;
    publish?: boolean;
  }): Promise<SingleRowResult> {
    const apiUrl = new URL(`${getPublicUrl()}/api/v1/cms/rows/${opts.rowId}`);
    if (opts.publish === true) {
      apiUrl.search = new URLSearchParams({
        publish: "1",
      }).toString();
    }
    const res = await fetch(apiUrl.toString(), {
      method: "PUT",
      headers: {
        ...this.makeAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(opts.variable),
    });
    const row = (await res.json()) as ApiCmsWriteRow;
    return this.processSingleRowResult(row, { ...opts, draft: !opts.publish });
  }

  async deleteOne(opts: { rowId: string }) {
    const res = await fetch(`${getPublicUrl()}/api/v1/cms/rows/${opts.rowId}`, {
      method: "DELETE",
      headers: {
        ...this.makeAuthHeader(),
      },
    });
    return await res.json();
  }

  private makeAuthHeader() {
    return {
      "x-plasmic-api-cms-tokens": `${this.source.settings.cmsId}:${this.source.credentials.secretToken}`,
    };
  }

  private async getDatabase() {
    const res = await fetch(
      `${getPublicUrl()}/api/v1/cms/databases/${this.source.settings.cmsId}`,
      {
        method: "GET",
        headers: {
          ...this.makeAuthHeader(),
        },
      }
    );
    return (await res.json()) as ApiCmsDatabase;
  }

  private async processSingleRowResult(
    row: ApiCmsWriteRow,
    opts?: { draft?: boolean }
  ) {
    const database = await this.getDatabase();
    const table = ensure(
      database.tables.find((t) => t.id === row.data.tableId),
      `Table not found: ${row.data.tableId}`
    );
    const res: SingleRowResult = {
      data: toTableRow(row, opts),
      schema: toTableSchema(table),
    };
    return res;
  }

  private async processManyRowsResult(
    resource: string,
    rows: ApiCmsWriteRow[],
    opts?: { draft?: boolean }
  ) {
    const res: ManyRowsResult = {
      data: rows.map((row) => toTableRow(row, opts)),
      schema: await this.getResourceSchema(resource),
    };
    return res;
  }
}

const CMS_TYPE_TO_BUILDER_TYPE = {
  text: "string",
  "long-text": "string",
  boolean: "boolean",
  number: "number",
  "date-time": "datetime",
} as const;

function toTableSchema(table: ApiCmsTable): TableSchema {
  return {
    id: table.identifier,
    label: table.name,
    fields: [
      {
        id: "id",
        label: "ID",
        type: "string",
        readOnly: false,
      },
      ...withoutNils(
        table.schema.fields.map((field): TableFieldSchema => {
          return {
            id: field.identifier,
            label: field.name,
            type: CMS_TYPE_TO_BUILDER_TYPE[field.type] ?? "unknown",
            readOnly: false,
          };
        })
      ),
    ],
  };
}

function toTableRow(row: ApiCmsWriteRow, opts?: { draft?: boolean }) {
  // Flatten row.data
  return {
    id: row.id,
    tableId: row.tableId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    identifier: row.identifier,
    ...((opts?.draft ? row.draftData : row.data) ?? row.data),
  };
}
