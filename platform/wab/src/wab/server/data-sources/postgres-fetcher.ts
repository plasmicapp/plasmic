import { asyncTimed } from "@/wab/server/timing-util";
import { NotFoundError } from "@/wab/shared/ApiErrors/errors";
import { assert, ensure } from "@/wab/shared/common";
import {
  DataSourceError,
  ParameterizedField,
  RawPagination,
  fillPagination,
} from "@/wab/shared/data-sources-meta/data-sources";
import { PostgresDataSource } from "@/wab/shared/data-sources-meta/postgres-meta";
import type { CrudSorting } from "@pankod/refine-core";
import {
  DataSourceSchema,
  ManyRowsResult,
  TableFieldSchema,
  TableFieldType,
  TableSchema,
} from "@plasmicapp/data-sources";
import { Mutex } from "async-mutex";
import { Dictionary, has, keyBy } from "lodash";
import moize from "moize";
import { Pool, PoolConfig, QueryResult } from "pg";

export const makePostgresFetcher = moize(
  (source: PostgresDataSource) => {
    return new PostgresFetcher(source);
  },
  {
    maxAge: 30 * 1000, // 10 second cache
    matchesArg: (cached: PostgresDataSource, arg: PostgresDataSource) => {
      return cached.id === arg.id;
    },
  }
);

type PostgresColumnQuery = {
  schema: string;
  table: string;
  name: string;
  data_type: string;
  format: string;
  is_identity: boolean;
  is_updatable: boolean;
  is_primary_key: boolean;
  enums: string[];
};

type PostgresTableQuery = {
  name: string;
  schema: string;
  columns: PostgresColumnQuery[];
};

function buildConnectionString(
  source: Pick<PostgresDataSource, "credentials" | "settings">
) {
  assert(
    source.settings.user !== undefined,
    "Postgres user should not be undefined"
  );
  assert(
    source.credentials.password !== undefined,
    "Postgres password should not be undefined"
  );
  assert(
    source.settings.host !== undefined,
    "Postgres host should not be undefined"
  );
  assert(
    source.settings.port !== undefined,
    "Postgres port should not be undefined"
  );
  assert(
    source.settings.name !== undefined,
    "Postgres database name should not be undefined"
  );
  const user = encodeURIComponent(source.settings.user);
  const password = encodeURIComponent(source.credentials.password);
  const host = encodeURIComponent(source.settings.host).replace(
    /http:\/\/|https:\/\//,
    ""
  );
  const port = encodeURIComponent(source.settings.port);
  const name = encodeURIComponent(source.settings.name);
  const connectionOptions =
    source.settings.connectionOptions &&
    Object.entries(source.settings.connectionOptions).length > 0
      ? new URLSearchParams(source.settings.connectionOptions)
      : undefined;
  return `postgres://${user}:${password}@${host}:${port}/${name}${
    connectionOptions ? `?${connectionOptions.toString()}` : ""
  }`;
}

export class PostgresFetcher {
  private pool: Pick<Pool, "connect" | "query">;
  private schema: DataSourceSchema | undefined;
  private lock = new Mutex();
  constructor(
    source: Pick<PostgresDataSource, "credentials" | "settings">,
    poolOptions?: PoolConfig
  ) {
    let connectionString = source.credentials.connectionString;
    if (!connectionString) {
      connectionString = buildConnectionString(source);
    }
    const _pool = new Pool({
      connectionString: connectionString,
      max: 20,
      ...poolOptions,
    });
    this.pool = Object.fromEntries(
      ["connect", "query"].map((op) => [
        op,
        asyncTimed(`postgres-fetcher-${op}`, (...args: any) => {
          try {
            const res = _pool[op](...args);
            if (res instanceof Promise) {
              return res.catch((err: any) => {
                throw new DataSourceError(
                  err?.message ?? "Failed to query database",
                  400
                );
              });
            }
            return res;
          } catch (err: any) {
            throw new DataSourceError(
              err?.message ?? "Failed to query database",
              400
            );
          }
        }),
      ])
    ) as any;
  }

  async getSchema(): Promise<DataSourceSchema> {
    await this.lock.acquire();
    try {
      if (this.schema) {
        return this.schema;
      }
      const result = await this.pool.query(schemaQuery);
      const rows = result.rows;
      this.schema = {
        tables: rows.map((row: PostgresTableQuery) => toTableSchema(row)),
      };
      return this.schema;
    } finally {
      this.lock.release();
    }
  }

  private async getSchemaFieldsFromResult(
    result: QueryResult<any>,
    schema?: TableSchema | undefined
  ) {
    if (result.fields.length === 0) {
      return [];
    }
    const typeIds = new Set(result.fields.map(({ dataTypeID }) => dataTypeID));
    const types = await this.pool.query(
      `SELECT oid, typcategory FROM pg_type WHERE oid IN (${Array.from(
        typeIds
      ).join(",")})`
    );
    const typeIdToModelType = Object.fromEntries<TableFieldType>(
      types.rows.map(({ oid, typcategory }) => [
        oid,
        POSTGRES_TYPE_CATEGORY_TO_BUILDER_TYPE[typcategory],
      ])
    );
    const primaryKeys = schema
      ? schema.fields.filter((field) => field.primaryKey)
      : [];

    // TODO: We should mark primary key fields for all operations
    // For custom sql and getMany, we're not marking the primary key fields beucase it would
    // require a new query, which would slow down our performance. For other operations, we
    // already have the table schema, and we can infer the primary keys
    //
    // const tableAndColumnIds = new Set(
    //   result.fields.map(({ tableID, columnID }) => ({ tableID, columnID }))
    // );
    // const primaryKeys = await this.pool.query(
    //   `SELECT a.attrelid AS tableID, a.attnum AS columnID
    //   FROM pg_attribute AS a
    //   JOIN pg_constraint AS c ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    //   WHERE (a.attrelid, a.attnum) IN (${Array.from(tableAndColumnIds)
    //     .map(({ tableID, columnID }) => `(${tableID},${columnID})`)
    //     .join(",")}) AND c.contype = 'p';`
    // );
    return result.fields.map(
      (field): TableFieldSchema => ({
        id: field.name,
        type: typeIdToModelType[field.dataTypeID] ?? "unknown",
        readOnly: false,
        label: field.name,
        primaryKey: primaryKeys.some(
          (primaryKey) => primaryKey.id === field.name
        ),
      })
    );
  }

  async getTableSchema({ resource }: { resource: string }) {
    if (!resource) {
      throw new DataSourceError(`Must specify table name`);
    }
    const dbSchema = await this.getSchema();
    const tableSchema = dbSchema.tables.find((table) => table.id === resource);
    if (!tableSchema) {
      throw new DataSourceError(`Table "${resource}" doesn't exist`);
    }
    return {
      data: [],
      schema: {
        id: resource,
        fields: tableSchema.fields,
      },
    };
  }

  async getOne(opts: { resource?: string; keys?: Record<string, any> }) {
    if (!opts.resource) {
      throw new DataSourceError(`Must specify table name`);
    }
    const { resource, tableSchema } = await this.sanitizeInputs(opts.resource);
    if (!tableSchema) {
      throw new DataSourceError(`Table "${opts.resource}" doesn't exist`);
    }
    const primaryKeys = tableSchema.fields.filter((field) => field.primaryKey);
    if (primaryKeys.length === 0) {
      throw new DataSourceError(
        `Invalid Table. "${opts.resource}" doesn't have any primary key`
      );
    }
    const missingPrimaryKeys = primaryKeys.filter(
      (primaryKey) => opts.keys?.[primaryKey.id] == null
    );
    if (missingPrimaryKeys.length > 0) {
      throw new DataSourceError(
        `Missing the following primary keys: ${missingPrimaryKeys
          .map((primaryKey) => primaryKey.label ?? primaryKey.id)
          .join(",")}`
      );
    }
    const queryStr = `SELECT * FROM "${resource}" WHERE (
      ${primaryKeys
        .map((primaryKey, idx) => `${primaryKey.id} = $${idx + 1}`)
        .join(" AND ")}
    )`;
    const result = await this.pool.query(
      queryStr,
      primaryKeys.map(
        (primaryKey) => ensure(opts.keys, "checked before")[primaryKey.id]
      )
    );
    return {
      data: result.rows,
      schema: {
        id: resource,
        fields: tableSchema.fields,
      },
    };
  }

  /**
   * Deprecated - this was misnamed, and it matters because getList is the generic query operation name across all data sources.
   */
  async getMany(opts: {
    resource: string;
    filters?: ParameterizedField | string;
    pagination?: RawPagination;
    sort?: CrudSorting;
  }): Promise<ManyRowsResult<any>> {
    return this.getList(opts);
  }

  async getList(opts: {
    resource: string;
    filters?: ParameterizedField | string;
    pagination?: RawPagination;
    sort?: CrudSorting;
  }): Promise<ManyRowsResult<any>> {
    const { parameterizedStr: filter, parameters } =
      this.getparameterizedStringAndParameters(opts.filters);
    const { resource, tableSchema } = await this.sanitizeInputs(
      opts.resource,
      undefined
    );
    const sort = opts.sort;
    const pagination = fillPagination(opts.pagination);
    const queryStr = `SELECT *FROM "${resource}" ${
      filter ? `WHERE ${filter}` : ``
    } ${
      sort && sort.length > 0
        ? `ORDER BY ${sort
            .map((s) => `${s.field} ${s.order === "desc" ? "DESC" : "ASC"} `)
            .join(", ")}`
        : ``
    } ${pagination ? `LIMIT ${pagination.pageSize}` : ``} ${
      pagination ? `OFFSET ${pagination.pageIndex * pagination.pageSize}` : ``
    }`;
    const result = await this.pool.query(queryStr, parameters ?? undefined);
    return {
      data: result.rows,
      schema: {
        id: resource,
        fields: tableSchema.fields,
      },
    };
  }

  async customRead(opts: {
    query: ParameterizedField;
  }): Promise<ManyRowsResult<any>> {
    const { parameterizedStr, parameters } =
      this.getparameterizedStringAndParameters(opts.query);
    const result = await this.pool.query(
      ensure(parameterizedStr, () => `No query string`),
      parameters ?? undefined
    );
    return {
      data: result.rows,
      schema: {
        id: "CustomRead",
        fields: await this.getSchemaFieldsFromResult(result),
      },
    };
  }

  async customWrite(opts: { query: ParameterizedField }) {
    const { parameterizedStr, parameters } =
      this.getparameterizedStringAndParameters(opts.query);
    const result = await this.pool.query(
      ensure(parameterizedStr, () => `No query string`),
      parameters ?? undefined
    );
    return {
      data: result.rows,
    };
  }

  async create(opts: { resource: string; variables: Record<string, any> }) {
    const { resource, columns, variables, tableSchema } =
      await this.sanitizeInputs(opts.resource, opts.variables);
    if (!columns || !columns.length || !variables) {
      const result = await this.pool.query(buildInsertQuery(resource, []));
      return {
        data: result.rows,
        rowCount: result.rowCount,
        schema: {
          id: resource,
          fields: tableSchema.fields,
        },
      };
    }
    const values = columns.map((c) => variables[c]);
    const result = await this.pool.query(
      buildInsertQuery(resource, columns),
      values
    );

    return {
      data: result.rows,
      rowCount: result.rowCount,
      schema: {
        id: resource,
        fields: tableSchema.fields,
      },
    };
  }

  async createMany(opts: {
    resource: string;
    variables: Record<string, any>[];
  }) {
    if (!opts.variables.length) {
      return 0;
    }
    const { resource, columns, variables, tableSchema } =
      await this.sanitizeInputs(opts.resource, opts.variables);
    if (!columns || !columns.length || !variables) {
      const result = await this.pool.query(buildInsertQuery(resource, []));
      return {
        data: result.rows,
        rowCount: result.rowCount,
        schema: {
          id: resource,
          fields: tableSchema.fields,
        },
      };
    }
    const safeColumns = new Set(columns);
    let rowCount = 0;
    const rows: any[] = [];
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const variable of variables) {
        const currentColumns = Object.keys(variable).filter((x) =>
          safeColumns.has(x)
        );
        const values = currentColumns.map((c) => variable[c]);
        if (!values.length) {
          continue;
        }
        const result = await client.query(
          buildInsertQuery(resource, currentColumns),
          values
        );
        rowCount += result.rowCount;
        rows.push(...result.rows);
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    return {
      data: rows,
      rowCount,
      schema: tableSchema,
    };
  }

  async updateById(opts: {
    resource: string;
    keys?: Record<string, any>;
    variables: Record<string, any>;
  }) {
    const { resource, columns, variables, tableSchema } =
      await this.sanitizeInputs(opts.resource, opts.variables);
    if (!columns || !columns.length || !variables) {
      return 0;
    }
    const primaryKeys = tableSchema.fields.filter((field) => field.primaryKey);
    if (primaryKeys.length === 0) {
      throw new DataSourceError(
        `Invalid Table. "${opts.resource}" doesn't have any primary key`
      );
    }
    const missingPrimaryKeys = primaryKeys.filter(
      (primaryKey) => opts.keys?.[primaryKey.id] == null
    );
    if (missingPrimaryKeys.length > 0) {
      throw new DataSourceError(
        `Missing the following primary keys: ${missingPrimaryKeys
          .map((primaryKey) => primaryKey.label ?? primaryKey.id)
          .join(",")}`
      );
    }
    const values = [
      ...primaryKeys.map(
        (primaryKey) => ensure(opts.keys, "checked before")[primaryKey.id]
      ),
      ...columns.map((c) => variables[c]),
    ];
    const result = await this.pool.query(
      `UPDATE "${resource}" SET ${columns
        .map((c, idx) => `"${c}" = $${idx + 1 + primaryKeys.length}`)
        .join(",")} WHERE (
          ${primaryKeys
            .map((primaryKey, idx) => `${primaryKey.id} = $${idx + 1}`)
            .join(" AND ")}
        ) RETURNING *`,
      values
    );
    return {
      data: result.rows,
      rowCount: result.rowCount,
      schema: {
        id: resource,
        fields: tableSchema.fields,
      },
    };
  }

  async updateMany(opts: {
    resource: string;
    variables: Record<string, any>;
    conditions?: ParameterizedField | string;
  }) {
    const { parameterizedStr: filter, parameters } =
      this.getparameterizedStringAndParameters(opts.conditions);
    const { resource, columns, variables, tableSchema } =
      await this.sanitizeInputs(opts.resource, opts.variables);
    if (!columns || !columns.length || !variables) {
      return 0;
    }
    const params = parameters ?? [];
    const values = params.concat(columns.map((c) => variables[c]));
    const result = await this.pool.query(
      `UPDATE "${resource}" SET ${columns
        .map((c, idx) => `"${c}" = $${idx + 1 + params.length}`)
        .join(",")}
        ${filter ? `WHERE ${filter}` : ``} RETURNING *`,
      values
    );
    return {
      data: result.rows,
      rowCount: result.rowCount,
      schema: {
        id: resource,
        fields: tableSchema.fields,
      },
    };
  }

  async deleteMany(opts: {
    resource: string;
    conditions?: ParameterizedField | string;
  }) {
    const { parameterizedStr: filter, parameters } =
      this.getparameterizedStringAndParameters(opts.conditions);
    const { resource, tableSchema } = await this.sanitizeInputs(
      opts.resource,
      undefined
    );
    const result = await this.pool.query(
      `DELETE FROM "${resource}"
        ${filter ? `WHERE ${filter}` : ``} RETURNING *`,
      parameters ?? undefined
    );
    return {
      data: result.rows,
      rowCount: result.rowCount,
      schema: {
        id: resource,
        fields: tableSchema.fields,
      },
    };
  }

  private async sanitizeInputs(
    resource: string,
    variables?: Record<string, any>[]
  ): Promise<{
    resource: string;
    columns?: string[];
    variables?: Record<string, any>[];
    tableSchema: TableSchema;
  }>;
  private async sanitizeInputs(
    resource: string,
    variables?: Record<string, any>
  ): Promise<{
    resource: string;
    columns?: string[];
    variables?: Record<string, any>;
    tableSchema: TableSchema;
  }>;
  private async sanitizeInputs(
    resource: string,
    variables?: Record<string, any> | Record<string, any>[]
  ): Promise<{
    resource: string;
    columns?: string[];
    variables?: Record<string, any> | Record<string, any>[];
    tableSchema: TableSchema;
  }> {
    const dbSchema = await this.getSchema();
    const sanitizedResource = dbSchema.tables.find(
      (table) => table.id === resource
    );
    if (!sanitizedResource) {
      throw new NotFoundError();
    }
    const knownColumns = keyBy(sanitizedResource.fields, "id");
    const formattedVariables = formatVariables(knownColumns, variables);
    const sanitizedColumns = formattedVariables
      ? Array.isArray(formattedVariables)
        ? formattedVariables.flatMap((v) => Object.keys(v))
        : Object.keys(formattedVariables)
      : undefined;

    return {
      resource: sanitizedResource.id,
      columns: sanitizedColumns,
      variables: formattedVariables,
      tableSchema: sanitizedResource,
    };
  }

  private getparameterizedStringAndParameters(
    field?: ParameterizedField | string
  ) {
    const parameterizedStr = typeof field === "string" ? field : field?.value;
    const parameters =
      typeof field === "string"
        ? undefined
        : Object.values(field?.parameters ?? {});
    return { parameterizedStr, parameters };
  }
}

const POSTGRES_FORMAT_TO_BUILDER_TYPE = {
  smallint: "number",
  integer: "number",
  bigint: "number",
  decimal: "number",
  numeric: "number",
  real: "number",
  "double precision": "number",
  smallserial: "number",
  serial: "number",
  bigserial: "number",
  uuid: "string",
  varchar: "string",
  "character varying": "string",
  character: "string",
  char: "string",
  text: "string",
  date: "date",
  "timestamp with time zone": "datetime",
  "timestamp without time zone": "datetime",
  boolean: "boolean",
  "USER-DEFINED": "enum",
  json: "json",
  jsonb: "json",
} as const;

const POSTGRES_TYPE_CATEGORY_TO_BUILDER_TYPE = {
  B: "boolean",
  D: "date",
  N: "number",
  S: "string",
} as const;

function toTableSchema(row: PostgresTableQuery): TableSchema {
  return {
    id: `${row.schema}"."${row.name}`,
    label: row.name,
    fields: row.columns.map((column): TableFieldSchema => {
      let builderType = POSTGRES_FORMAT_TO_BUILDER_TYPE[column.data_type];
      if (builderType === "enum" && column.enums.length === 0) {
        builderType = undefined;
      }
      return {
        id: column.name,
        label: column.name,
        type: builderType ?? "unknown",
        readOnly: false,
        primaryKey: column.is_primary_key,
        options: column.enums,
      };
    }),
  };
}

function buildInsertQuery(resource: string, columns: string[]): string {
  const columnsQuery =
    columns.length === 0
      ? "DEFAULT VALUES"
      : `(${columns.map((c) => `"${c}"`).join(",")})
  VALUES (${columns.map((_, idx) => `$${idx + 1}`).join(",")})`;
  return `INSERT INTO "${resource}" ${columnsQuery} RETURNING *`;
}

function formatVariables(
  columns: Dictionary<TableFieldSchema>,
  variables?: Record<string, any> | Record<string, any>[]
): Record<string, any> | Record<string, any>[] | undefined {
  if (!variables) {
    return undefined;
  }
  const formatValue = (val: any, type: TableFieldType) => {
    // We need to stringify the array if the column is of type json/jsonb
    // because node-pg treats js arrays as native postgres arrays
    // https://github.com/brianc/node-postgres/issues/442
    if (Array.isArray(val) && type === "json") {
      return JSON.stringify(val);
    }
    return val;
  };
  if (Array.isArray(variables)) {
    return variables.map((variable) =>
      Object.keys(variable).reduce((record, column) => {
        const columnId = formatIdentifier(column);
        if (has(columns, columnId)) {
          record[columnId] = formatValue(
            variable[column],
            columns[columnId].type
          );
        }
        return record;
      }, {} as Record<string, any>)
    );
  } else {
    return Object.keys(variables).reduce((record, column) => {
      const columnId = formatIdentifier(column);
      if (has(columns, columnId)) {
        record[columnId] = formatValue(
          variables[column],
          columns[columnId].type
        );
      }
      return record;
    }, {} as Record<string, any>);
  }
}

function formatIdentifier(identifier: string) {
  return identifier.startsWith(`"`) && identifier.endsWith(`"`)
    ? identifier.slice(1, -1)
    : identifier;
}

const tablesQuery = `
SELECT c.oid :: int8          AS id,
       nc.nspname             AS schema,
       c.relname              AS name,
       obj_description(c.oid) AS comment
FROM   pg_namespace nc
       JOIN pg_class c
         ON nc.oid = c.relnamespace
WHERE  c.relkind IN ( 'r', 'p' )
       AND
( pg_has_role(c.relowner, 'USAGE')
   OR has_table_privilege(c.oid,
          'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
   OR has_any_column_privilege(c.oid, 'SELECT, INSERT, UPDATE, REFERENCES')
)
`;

const columnsQuery = `
SELECT c.table_schema AS schema,
       c.table_name AS table,
       c.column_name AS name,
       c.column_default AS default,
       c.data_type,
       c.udt_name AS format,
       (c.is_identity = 'YES') AS is_identity,
       (c.is_updatable = 'YES') AS is_updatable,
       CASE
           WHEN pk.column_name IS NOT NULL THEN TRUE
           ELSE FALSE
       END AS is_primary_key,
       array_to_json(array
                       (SELECT e.enumlabel
                        FROM pg_enum e
                        JOIN pg_type t ON e.enumtypid = t.oid
                        WHERE t.typname = udt_name
                        ORDER BY e.enumsortorder)) AS enums
FROM information_schema.columns c
LEFT JOIN
  (SELECT ku.table_catalog,
          ku.table_schema,
          ku.table_name,
          ku.column_name
   FROM information_schema.table_constraints AS tc
   INNER JOIN information_schema.key_column_usage AS ku ON tc.constraint_type = 'PRIMARY KEY'
   AND tc.constraint_name = ku.constraint_name) pk ON c.table_catalog = pk.table_catalog
AND c.table_schema = pk.table_schema
AND c.table_name = pk.table_name
AND c.column_name = pk.column_name
`;

const schemaQuery = `
WITH tables as (${tablesQuery}),
columns as (${columnsQuery})
SELECT
  name,
  schema,
  COALESCE(
    (
      SELECT
        array_agg(
          row_to_json(columns)
        ) FILTER (
          WHERE
            columns.schema = tables.schema AND columns.table = tables.name
        )
      FROM
        columns
    ),
    '{}'::json[]
  ) AS columns
FROM
  tables
WHERE
  schema NOT IN (
    'information_schema', 'pg_catalog',
    'pg_temp_1', 'pg_toast', 'pg_toast_temp_1'
  )
`;
