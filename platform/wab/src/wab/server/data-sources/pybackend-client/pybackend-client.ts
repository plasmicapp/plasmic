import { ensure, ensureType, jsonClone, strictIdentity } from "@/wab/shared/common";
import jsonFetch from "@/wab/commons/json-fetch";
import {
  fillPagination,
  Filters,
  RawPagination,
} from "@/wab/shared/data-sources-meta/data-sources";
import { CrudSorting } from "@pankod/refine-core";
import {
  DataSourceSchema,
  ManyRowsResult,
  Pagination,
  SingleRowResult,
} from "@plasmicapp/data-sources";

export interface SelectOp {
  op: "select";
  resource: string;
  filters?: Filters;
  sort?: CrudSorting;
  pagination?: Pagination;
}

export interface InsertOp {
  op: "insert";
  resource: string;
  writes: Record<string, any>;
}

export interface UpdateOp {
  op: "update";
  resource: string;
  filters?: Filters;
  writes: Record<string, any>;
}

export interface DeleteOp {
  op: "delete";
  resource: string;
  filters?: Filters;
}

export interface InspectOp {
  op: "inspect";
  /** Optional explicit list of tables to inspect */
  inspectTables?: string[];
}

export type SqlalchemyOpBody =
  | SelectOp
  | InsertOp
  | UpdateOp
  | DeleteOp
  | InspectOp;

export interface SqlalchemyOpHeader {
  dburi: string;
  engineKwargs?: Record<string, any>;
}

export interface SqlalchemyOpEnvelope extends SqlalchemyOpHeader {
  body: SqlalchemyOpBody;
}

// From https://github.com/betodealmeida/shillelagh/blob/main/src/shillelagh/adapters/api/gsheets/fields.py
export const SQLITE_TO_BUILDER_TYPE = {
  REAL: "number",
  VARCHAR: "string",
  TEXT: "string",
  DATE: "date",
  TIME: "time",
  TIMESTAMP: "datetime",
  BOOLEAN: "boolean",
  // TODO We don't have a duration type.
  DURATION: "string",
} as const;

export class SqlalchemyClient {
  constructor(
    private methodWrapper:
      | undefined
      | (<T>(fn: () => Promise<T>) => Promise<T>),
    private header: SqlalchemyOpHeader,
    private getSchema: () => DataSourceSchema,
    private resourceWrapper: (resource: string) => string = strictIdentity
  ) {}

  setEngineKwargs(engineKwargs: Record<string, any>) {
    this.header.engineKwargs = engineKwargs;
  }

  async getList(opts: {
    resource: string;
    filters?: Filters;
    sort?: CrudSorting;
    pagination?: RawPagination;
  }) {
    return this.wrap(async () => {
      const rawResult = await this.executeOp({
        op: "select",
        resource: opts.resource,
        filters: opts.filters,
        sort: opts.sort,
        pagination: fillPagination(opts.pagination),
      });

      const result = { data: rawResult };

      return this.processResult(opts.resource, result, {
        paginate: opts.pagination,
      });
    });
  }

  async create(opts: { resource: string; variables: Record<string, any> }) {
    return this.wrap(async () => {
      await this.executeOp({
        op: "insert",
        resource: opts.resource,
        writes: opts.variables,
      });
    });
  }

  async updateMany(opts: {
    resource: string;
    variables: Record<string, any>;
    conditions?: Filters;
  }) {
    return this.wrap(async () => {
      await this.executeOp({
        op: "update",
        resource: opts.resource,
        filters: opts.conditions,
        writes: opts.variables,
      });
    });
  }

  async deleteMany(opts: { resource: string; conditions?: Filters }) {
    return this.wrap(async () => {
      await this.executeOp({
        op: "delete",
        resource: opts.resource,
        filters: opts.conditions,
      });
    });
  }

  async executeOp(body: SqlalchemyOpBody) {
    body = jsonClone(body);
    if ("resource" in body) {
      body.resource = this.resourceWrapper(body.resource);
    }
    const { result } = await jsonFetch(
      "http://localhost:8000/api/v1/sqlalchemy",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          ensureType<SqlalchemyOpEnvelope>({
            ...this.header,
            body,
          })
        ),
      }
    );
    return result;
  }

  private async wrap<T>(fn: () => Promise<T>) {
    return this.methodWrapper ? this.methodWrapper(fn) : fn();
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

  async getResourceSchema(resource: string) {
    const schema = await this.getSchema();
    return ensure(
      schema.tables.find((t) => t.id === resource),
      `Unknown resource ${resource}`
    );
  }

  createFetcher() {
    return {
      getSchema: this.getSchema,
      getList: this.getList.bind(this),
      create: this.create.bind(this),
      updateMany: this.updateMany.bind(this),
      deleteMany: this.deleteMany.bind(this),
    };
  }
}
