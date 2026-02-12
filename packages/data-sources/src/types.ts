export interface Pagination {
  pageSize: number;
  pageIndex: number;
}

export interface DataSourceSchema {
  tables: TableSchema[];
}

export interface TableSchema {
  id: string;
  schema?: string;
  label?: string;
  fields: TableFieldSchema[];
}

export interface TableFieldSchema {
  id: string;
  label?: string;
  type: TableFieldType;
  readOnly: boolean;
  primaryKey?: boolean;
  options?: string[];
}

export type TableFieldType =
  | "string"
  | "boolean"
  | "number"
  | "date"
  | "datetime"
  | "enum"
  | "json"
  | "unknown";

export interface SingleRowResult<T = any> {
  data: T;
  schema: TableSchema;
}

export interface ManyRowsResult<T = any> {
  data: T[];
  total?: number;
  schema: TableSchema;
  paginate?: Pagination;
}

export interface DataOp {
  sourceId: string;
  opId: string;
  userArgs?: Record<string, any>;
  cacheKey?: string;
  invalidatedKeys?: string[] | null;
  roleId?: string | null;
}

/** @deprecated */
export interface ServerQueryResult<T = any> {
  data: T;
  isLoading: boolean;
}

/**
 * Represents the result of a client-side query.
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
