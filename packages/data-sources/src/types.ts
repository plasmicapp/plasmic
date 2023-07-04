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
}

export type TableFieldType =
  | 'string'
  | 'boolean'
  | 'number'
  | 'date'
  | 'datetime'
  | 'unknown';

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
