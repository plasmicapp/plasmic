import { ApiCmsQuery, ApiCmsRow, ApiCmsTable } from "./schema";

export interface DatabaseConfig {
  host: string;
  databaseId: string;
  databaseToken: string;
  locale?: string;
  useDraft?: boolean | string[];
}

export interface QueryParams {
  useDraft?: boolean;
  where?: any;
  orderBy?: string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  fields?: string[];
}

function queryParamsToApi(params: QueryParams): ApiCmsQuery {
  return {
    where: params.where,
    limit: params.limit,
    offset: params.offset,
    order: params.orderBy
      ? [
          {
            field: params.orderBy,
            dir: params.desc ? "desc" : "asc",
          },
        ]
      : undefined,
    fields: params.fields,
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export class API {
  constructor(private config: DatabaseConfig) {}

  async get(endpoint: string, params: any = {}) {
    const url = new URL(
      `${this.config.host}/api/v1/cms/databases/${this.config.databaseId}${endpoint}`
    );
    const fixedParams = Object.keys(params).reduce((newObj, key) => {
      const value = params[key];
      if (value != null) {
        newObj[key] = value;
      }
      return newObj;
    }, {} as any);
    url.search = new URLSearchParams(fixedParams).toString();
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "*/*",
        "x-plasmic-api-cms-tokens": `${this.config.databaseId}:${this.config.databaseToken}`,
      },
      mode: "cors",
    });

    if (response.status !== 200) {
      let message = await response.text();
      try {
        const json = JSON.parse(message);
        if (json.error?.message) {
          message = json.error.message;
        }
      } catch {
        // ignored
      }
      throw new HttpError(response.status, message);
    }

    return await response.json();
  }

  async fetchTables(): Promise<ApiCmsTable[]> {
    try {
      const response = await this.get(``);
      return response.tables;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  private useDraftForTable(table: string) {
    if (Array.isArray(this.config.useDraft)) {
      return this.config.useDraft.includes(table);
    } else {
      return this.config.useDraft ?? false;
    }
  }

  async query(table: string, params: QueryParams = {}): Promise<ApiCmsRow[]> {
    try {
      const response = await this.get(`/tables/${table}/query`, {
        q: JSON.stringify(queryParamsToApi(params)),
        draft: Number(this.useDraftForTable(table) ?? params.useDraft),
        locale: this.config.locale,
      });
      return response.rows;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async count(
    table: string,
    params: Pick<QueryParams, "where" | "useDraft"> = {}
  ): Promise<number> {
    try {
      const response = await this.get(`/tables/${table}/count`, {
        q: JSON.stringify(queryParamsToApi(params)),
        draft: Number(this.useDraftForTable(table) ?? params.useDraft),
      });
      return response.count;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}

export function mkApi(config: DatabaseConfig | undefined) {
  if (!config) {
    throw new Error("Component must be wrapped in 'CMS Data Provider'.");
  }

  return new API(config);
}
