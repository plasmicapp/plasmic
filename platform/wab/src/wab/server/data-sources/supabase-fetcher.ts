import { ensure, withoutNils } from "@/wab/shared/common";
import { filtersToRefineFilters } from "@/wab/server/data-sources/data-source-utils";
import { base64StringToBuffer } from "@/wab/server/data-sources/data-utils";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { DATA_SOURCE_QUERY_BUILDER_CONFIG } from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  buildQueryBuilderConfig,
  DataSourceError,
  fillPagination,
  Filters,
  RawPagination,
} from "@/wab/shared/data-sources-meta/data-sources";
import { SupabaseDataSource } from "@/wab/shared/data-sources-meta/supabase-meta";
import { CrudFilters, CrudSorting, DataProvider } from "@pankod/refine-core";
import { dataProvider } from "@pankod/refine-supabase";
import {
  DataSourceSchema,
  ManyRowsResult,
  SingleRowResult,
  TableFieldSchema,
} from "@plasmicapp/data-sources";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

export function makeSupabaseFetcher(source: SupabaseDataSource) {
  return new SupabaseFetcher(source);
}

export type SupabaseSchema = Record<string, SupabaseTable>;

export interface SupabaseTable {
  required: string[];
  properties: Record<
    string,
    { description?: string; format: string; type: string }
  >;
  type: "object";
}

export class SupabaseFetcher {
  private supabaseClient: SupabaseClient;
  private client: DataProvider;
  constructor(private source: SupabaseDataSource) {
    this.supabaseClient = createClient(
      source.settings.url,
      source.credentials.apiKey
    );
    this.client = dataProvider(this.supabaseClient);
  }

  async getSchema(): Promise<DataSourceSchema> {
    const response = await fetch(
      `${this.source.settings.url}/rest/v1/?apikey=${this.source.credentials.apiKey}`
    );
    const data = await response.json();

    if (!data.definitions) {
      throw new Error(`Supabase db without any tables`);
    }

    const definitions = data.definitions as SupabaseSchema;
    return {
      tables: Object.entries(definitions).map(([id, def]) => ({
        id: id,
        label: "",
        fields: withoutNils(
          Object.entries(def.properties).map(
            ([pid, prop]): TableFieldSchema => {
              return {
                id: pid,
                label: pid,
                type: SUPABASE_FORMAT_TO_BUILDER_TYPE[prop.format] ?? "unknown",
                readOnly: false,
              };
            }
          )
        ),
      })),
    };
  }

  async getResourceSchema(resource: string) {
    const schema = await this.getSchema();
    return ensure(
      schema.tables.find((t) => t.id === resource),
      `Unknown resource ${resource}`
    );
  }

  async getMany(opts: { resource: string; ids: string[] }) {
    return this.processResult(opts.resource, await this.client.getMany(opts));
  }

  async getList(opts: {
    resource: string;
    paginate?: RawPagination;
    sort?: CrudSorting;
    filters?: Filters;
  }) {
    let filters: CrudFilters | undefined = undefined;
    if (opts.filters) {
      const builderConfig = buildQueryBuilderConfig(
        DATA_SOURCE_QUERY_BUILDER_CONFIG.supabase,
        opts.filters.fields
      );
      filters = filtersToRefineFilters(opts.filters, builderConfig);
    }
    const pagination = fillPagination(opts.paginate);
    return this.processResult(
      opts.resource,
      await this.client.getList({
        ...opts,
        filters,
        pagination: pagination
          ? {
              // refine uses 1-based page index
              current: pagination.pageIndex + 1,
              pageSize: pagination.pageSize,
            }
          : undefined,
        hasPagination: !!pagination,
      }),
      opts
    );
  }

  async getOne(opts: { resource: string; id: string }) {
    return this.processResult(opts.resource, await this.client.getOne(opts));
  }

  async create(opts: { resource: string; variables: Record<string, any> }) {
    return this.processResult(opts.resource, await this.client.create(opts));
  }

  async createMany(opts: {
    resource: string;
    variables: Record<string, any>[];
  }) {
    return this.processResult(
      opts.resource,
      await this.client.createMany(opts)
    );
  }

  async updateOne(opts: { resource: string; variables: Record<string, any> }) {
    const { id, ...rest } = opts.variables;
    if (!id) {
      throw new BadRequestError(`Must specify an ID to update`);
    }
    return this.processResult(
      opts.resource,
      await this.client.update({
        ...opts,
        id,
        variables: rest,
      })
    );
  }

  async updateMany(opts: {
    resource: string;
    variables: Record<string, any>[];
  }) {
    const ids = opts.variables.map((val: any) => val.id);
    const variables = opts.variables[0];
    delete variables["id"];
    return this.processResult(
      opts.resource,
      await this.client.updateMany({
        ...opts,
        variables,
        ids,
      })
    );
  }

  async deleteOne(opts: { resource: string; id: string }) {
    return this.client.deleteOne(opts);
  }

  async deleteMany(opts: { resource: string; ids: string[] }) {
    return this.client.deleteMany(opts);
  }

  async uploadFile(opts: {
    bucket: string;
    path: string;
    content: string;
    contentType: string;
    upsert?: boolean;
  }) {
    const res = await this.supabaseClient.storage
      .from(opts.bucket)
      .upload(opts.path, base64StringToBuffer(opts.content), {
        contentType: opts.contentType,
        upsert: opts.upsert,
      });
    if (res.error) {
      throw new DataSourceError(
        res.error.message,
        (res.error as any).statusCode
      );
    }
    return res.data;
  }

  async getSignedFileUrl(opts: {
    bucket: string;
    path: string;
    expiresIn: number;
    download?: boolean;
  }) {
    const res = await this.supabaseClient.storage
      .from(opts.bucket)
      .createSignedUrl(opts.path, opts.expiresIn, {
        download: opts.download,
      });
    return res.data;
  }

  private async processResult(
    resource: string,
    result: Omit<SingleRowResult, "schema"> | Omit<ManyRowsResult, "schema">,
    opts?: { paginate?: RawPagination }
  ): Promise<SingleRowResult | ManyRowsResult> {
    if (opts?.paginate) {
      (result as ManyRowsResult).paginate = fillPagination(opts.paginate);
    }
    return Object.assign(result, {
      schema: await this.getResourceSchema(resource),
    });
  }
}

const SUPABASE_FORMAT_TO_BUILDER_TYPE = {
  bigint: "number",
  numeric: "number",
  uuid: "string",
  text: "string",
  "character varying": "string",
  "timestamp with time zone": "datetime",
} as const;
