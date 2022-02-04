import { ApiCmsQuery, ApiCmsRow, ApiCmsTable } from "./schema";

export interface DatabaseConfig {
  host: string;
  projectId: string;
  projectApiToken: string;
  databaseId: string;
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

    return await response.json();
  }

  async fetchTables(): Promise<ApiCmsTable[]> {
    try {
      const response = await this.get(``);
      return response.tables;
    } catch (e) {
      console.error(e);
      throw new Error("Cannot fetch CMS models.");
    }
  }

  async query(table: string, params: QueryParams): Promise<ApiCmsRow[]> {
    try {
      const response = await this.get(`/tables/${table}/query`, {
        q: JSON.stringify(queryParamsToApi(params)),
        useDraft: Number(params.useDraft),
      });
      return response.rows;
    } catch (e) {
      console.error(e);
      throw new Error("Query returned invalid response.");
    }
  }

  async fetchRow(
    table: string,
    row: string,
    useDraft: boolean
  ): Promise<ApiCmsRow> {
    try {
      const maybeUseDraft = useDraft ? `?useDraft=1` : ``;
      const response = await this.get(
        `/tables/${table}/rows/${row}${maybeUseDraft}`
      );
      return response;
    } catch (e) {
      console.error(e);
      throw new Error("Query returned invalid response.");
    }
  }
}

export function mkApi(config: DatabaseConfig | undefined) {
  if (!config) {
    throw new Error("Component must be wrapped in 'CMS Data Provider'.");
  }

  return new API(config);
}
