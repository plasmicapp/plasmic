import { Client, QueryResult } from "pg";

export interface Waitable<T> {
  wait(): T;
}

export class SyncPgClient {
  constructor(private client: Client) {}
  query(query: string, params?: any[]) {
    return (this.client.query(query, params) as any) as Waitable<QueryResult>;
  }
  end() {
    return this.client.end();
  }
}
