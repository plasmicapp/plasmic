import { ApiCmsRow, ApiCmsTable } from "./schema";

export interface DatabaseConfig {
  apiUrl: string;
  projectId: string;
  projectApiToken: string;
  databaseId: string;
}

export interface QueryParams {
  offset: number;
  limit: number;
  filter: {};
}

class API {
  constructor(private config: DatabaseConfig) {}

  async get(endpoint: string, params: {} = {}) {
    const response = await fetch(
      `${this.config.apiUrl}/cms/databases/${this.config.databaseId}${endpoint}`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
          "x-plasmic-api-project-tokens": `${this.config.projectId}:${this.config.projectApiToken}`,
        },
        body: JSON.stringify(params),
      }
    );

    return await response.json();
  }

  async fetchTables(): Promise<ApiCmsTable[]> {
    const response = await this.get(``);
    return response.tables;
  }

  async query(table: string, params: QueryParams): Promise<ApiCmsRow[]> {
    const response = await this.get(`/tables/${table}/query`, params);
    return response.rows;
  }

  async fetchRow(table: string, row: string): Promise<ApiCmsRow> {
    const response = await this.get(`/tables/${table}/rows/${row}`);
    return response;
  }
}

export function mkApi(config: DatabaseConfig | undefined) {
  if (!config) {
    throw new Error("Component must be wrapped in 'CMS Data Provider'.");
  }

  return new API(config);
}
