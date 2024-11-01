import {
  DataDict,
  DataProvider,
  useDataEnv,
  useSelector,
} from "@plasmicapp/host";
import React from "react";
import { DatabaseConfig } from "./api";
import { ApiCmsRow, ApiCmsTable } from "./schema";

const contextPrefix = "plasmicCms";
const databaseContextKey = `${contextPrefix}Database`;
const tablesContextKey = `${contextPrefix}Tables`;
const tableSchemaContextKey = `${contextPrefix}TableSchema`;
const collectionResultSuffix = `Collection`;
export const mkQueryContextKey = (table: string) =>
  `${contextPrefix}${capitalizeFirst(table)}${collectionResultSuffix}`;
const itemContextSuffix = `Item`;
const countContextSuffix = `Count`;
const modeContextSuffix = `Mode`;
const mkRowContextKey = (table: string) =>
  `${contextPrefix}${capitalizeFirst(table)}${itemContextSuffix}`;
const mkCountContextKey = (table: string) =>
  `${contextPrefix}${capitalizeFirst(table)}${countContextSuffix}`;
const mkModeContextKey = (table: string) =>
  `${contextPrefix}${capitalizeFirst(table)}${modeContextSuffix}`;

function capitalizeFirst(str: string): string {
  return str[0]?.toUpperCase() + str.slice(1);
}

export function useDatabase() {
  return useSelector(databaseContextKey) as DatabaseConfig | undefined;
}

export function makeDatabaseCacheKey(config: DatabaseConfig | undefined) {
  if (!config) {
    return null;
  }
  const { databaseToken, ...rest } = config;
  return JSON.stringify(rest);
}

export function DatabaseProvider({
  config,
  children,
}: {
  config: DatabaseConfig;
  children?: React.ReactNode;
}) {
  return (
    <DataProvider name={databaseContextKey} data={config} hidden={true}>
      {children}
    </DataProvider>
  );
}

export function useTables() {
  return useSelector(tablesContextKey) as ApiCmsTable[] | undefined;
}

export function TablesProvider({
  children,
  tables,
}: {
  children?: React.ReactNode;
  tables?: ApiCmsTable[];
}) {
  return (
    <DataProvider name={tablesContextKey} data={tables} hidden={true}>
      {children}
    </DataProvider>
  );
}

export function TableSchemaProvider({
  children,
  table,
}: {
  children?: React.ReactNode;
  table?: string | undefined;
}) {
  const tables = useTables();

  let schema;
  if (tables && tables?.length > 0) {
    if (!table) {
      schema = tables[0]?.schema;
    } else {
      schema = tables?.find((t) => t?.identifier === table)?.schema;
    }
  }
  return (
    <DataProvider name={tableSchemaContextKey} data={schema}>
      {children}
    </DataProvider>
  );
}

export function useQueryResults(table?: string) {
  const env = useDataEnv();
  const tables = useTables();

  if (!env) {
    return undefined;
  }

  if (table) {
    return {
      table,
      rows: (env[mkQueryContextKey(table)] ?? []) as ApiCmsRow[],
    };
  }
  if (!tables) {
    return undefined;
  }

  const matchingKeys = getClosestMatchingKeys(env, collectionResultSuffix);
  for (const key of matchingKeys) {
    const inferredTable = tables.find(
      (t) => mkQueryContextKey(t.identifier) === key
    );
    if (inferredTable) {
      return {
        table: inferredTable.identifier,
        rows: (env[key] ?? []) as ApiCmsRow[],
      };
    }
  }
  return undefined;
}

function getClosestMatchingKeys(env: DataDict, suffix: string) {
  return [...Object.keys(env).reverse()].filter((k) => k.endsWith(suffix));
}

function getClosestMatchingKeysBy(
  env: DataDict,
  pred: (str: string) => boolean
) {
  return [...Object.keys(env).reverse()].filter((key) => pred(key));
}

export function QueryResultProvider({
  children,
  table,
  rows,
  hidden,
}: {
  children?: React.ReactNode;
  table: string | undefined;
  rows: ApiCmsRow[] | undefined;
  hidden?: boolean;
}) {
  return (
    <DataProvider
      name={table ? mkModeContextKey(table) : undefined}
      data="rows"
      hidden
    >
      <DataProvider
        name={table ? mkQueryContextKey(table) : undefined}
        data={rows}
        hidden={hidden}
      >
        {children}
      </DataProvider>
    </DataProvider>
  );
}

export function useTablesWithDataLoaded(mode: "rows" | "count" | undefined) {
  const env = useDataEnv();
  const tables = useTables();

  if (!env) {
    return undefined;
  }

  if (!tables) {
    return undefined;
  }

  const matchingKeys = getClosestMatchingKeysBy(env, (key) => {
    if (mode === "rows") {
      return key.endsWith(itemContextSuffix);
    } else if (mode === "count") {
      return key.endsWith(countContextSuffix);
    } else {
      return (
        key.endsWith(itemContextSuffix) || key.endsWith(countContextSuffix)
      );
    }
  });

  return tables.filter((table) =>
    matchingKeys.some((key) => {
      if (mode === "rows") {
        return mkRowContextKey(table.identifier) === key;
      } else if (mode === "count") {
        return mkCountContextKey(table.identifier) === key;
      } else {
        return (
          mkRowContextKey(table.identifier) === key ||
          mkCountContextKey(table.identifier) === key
        );
      }
    })
  );
}

function deriveTableId(tables?: ApiCmsTable[], table?: string) {
  if (!table && tables && tables.length > 0) {
    table = tables[0].identifier;
  }
  return table;
}

export function useRow(tables?: ApiCmsTable[], table?: string) {
  const env = useDataEnv();

  if (!env) {
    return undefined;
  }

  table = deriveTableId(tables, table);

  if (table) {
    return {
      table,
      row: env[mkRowContextKey(table)] as ApiCmsRow | undefined,
    };
  }

  return undefined;
}

export function useCount(tables?: ApiCmsTable[], table?: string) {
  const env = useDataEnv();

  if (!env) {
    return undefined;
  }

  table = deriveTableId(tables, table);

  if (table) {
    return {
      table,
      count: env[mkCountContextKey(table)] as number | undefined,
    };
  }

  return undefined;
}

export function RowProvider({
  children,
  table,
  row,
}: {
  children?: React.ReactNode;
  table: string;
  row: ApiCmsRow;
}) {
  return (
    <DataProvider name={mkRowContextKey(table)} data={row}>
      {children}
    </DataProvider>
  );
}

export function CountProvider({
  children,
  table,
  count,
}: {
  children?: React.ReactNode;
  table: string | undefined;
  count: number | undefined;
}) {
  return (
    <DataProvider
      name={table ? mkModeContextKey(table) : undefined}
      data="count"
      hidden
    >
      <DataProvider
        name={table ? mkCountContextKey(table) : undefined}
        data={count}
      >
        {children}
      </DataProvider>
    </DataProvider>
  );
}
