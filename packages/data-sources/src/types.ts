/** @deprecated See https://docs.plasmic.app/learn/integrations */
export interface Pagination {
  pageSize: number;
  pageIndex: number;
}

/** @deprecated See https://docs.plasmic.app/learn/integrations */
export interface DataSourceSchema {
  tables: TableSchema[];
}

/** @deprecated See https://docs.plasmic.app/learn/integrations */
export interface TableSchema {
  id: string;
  schema?: string;
  label?: string;
  fields: TableFieldSchema[];
}

/** @deprecated See https://docs.plasmic.app/learn/integrations */
export interface TableFieldSchema {
  id: string;
  label?: string;
  type: TableFieldType;
  readOnly: boolean;
  primaryKey?: boolean;
  options?: string[];
}

/** @deprecated See https://docs.plasmic.app/learn/integrations */
export type TableFieldType =
  | "string"
  | "boolean"
  | "number"
  | "date"
  | "datetime"
  | "enum"
  | "json"
  | "unknown";

/** @deprecated See https://docs.plasmic.app/learn/integrations */
export interface SingleRowResult<T = any> {
  data: T;
  schema: TableSchema;
}

/** @deprecated See https://docs.plasmic.app/learn/integrations */
export interface ManyRowsResult<T = any> {
  data: T[];
  total?: number;
  schema: TableSchema;
  paginate?: Pagination;
}

/** @deprecated See https://docs.plasmic.app/learn/integrations */
export interface DataOp {
  sourceId: string;
  opId: string;
  userArgs?: Record<string, any>;
  cacheKey?: string;
  invalidatedKeys?: string[] | null;
  roleId?: string | null;
}

/**
 * Represents the result of a client-side query.
 * @deprecated See https://docs.plasmic.app/learn/integrations
 */
export interface ClientQueryResult<T = any> {
  /**
   * The data returned by the query. May be undefined if the query has not yet completed.
   */
  data?: T;
  /**
   * The schema of the table from which the data was queried. Only available for plasmic data
   * integration. May be undefined if the query has not yet completed.
   */
  schema?: TableSchema;
  /**
   * The total number of records available. Only available for plasmic data integration. May be
   * undefined if the query has not yet completed.
   */
  total?: number;
  /**
   * Pagination information for the query result. Only available for plasmic data integration. May be
   * undefined if the query has not yet completed.
   */
  paginate?: Pagination;
  /**
   * Any error that occurred during the query. This is optional and may be undefined.
   */
  error?: any;
  /**
   * Indicates whether the query is currently loading.
   */
  isLoading?: boolean;
}
