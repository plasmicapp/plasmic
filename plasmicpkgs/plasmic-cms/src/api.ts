import { ApiCmsQuery, ApiCmsRow, ApiCmsTable } from "./schema";

export interface DatabaseConfig {
  host: string;
  projectId: string;
  projectApiToken: string;
  databaseId: string;
  locale: string;
}

export interface QueryParams {
  useDraft: boolean;
  where: {};
  orderBy: string;
  desc: boolean;
  limit: number;
}

function queryParamsToApi(params: QueryParams): ApiCmsQuery {
  return {
    where: params.where,
    limit: params.limit,
    order: [
      {
        field: params.orderBy,
        dir: params.desc ? "desc" : "asc",
      },
    ],
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

class API {
  constructor(private config: DatabaseConfig) {}

  async get(endpoint: string, params: {} = {}) {
    const url = new URL(
      `${this.config.host}/api/v1/cms/databases/${this.config.databaseId}${endpoint}`
    );
    url.search = new URLSearchParams(params).toString();
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "*/*",
        "x-plasmic-api-project-tokens": `${this.config.projectId}:${this.config.projectApiToken}`,
      },
      mode: "cors",
    });

    if (response.status !== 200) {
      let message;
      try {
        message = (await response.json())?.error?.message;
      } catch {
        message = await response.text();
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

  async query(table: string, params: QueryParams): Promise<ApiCmsRow[]> {
    try {
      const response = await this.get(`/tables/${table}/query`, {
        q: JSON.stringify(queryParamsToApi(params)),
        draft: Number(params.useDraft),
        locale: this.config.locale,
      });
      return response.rows;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async fetchRow(
    table: string,
    row: string,
    useDraft: boolean
  ): Promise<ApiCmsRow> {
    try {
      const response = await this.get(
        `/tables/${table}/rows/${row}`, {
          draft: Number(useDraft),
          locale: this.config.locale,
        }
      );
      return response;
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
