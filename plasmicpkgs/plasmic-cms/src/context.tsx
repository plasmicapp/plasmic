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
const collectionResultSuffix = `Collection`;
const mkQueryContextKey = (table: string) =>
  `${contextPrefix}${table}${collectionResultSuffix}`;
const itemContextSuffix = `Item`;
const mkRowContextKey = (table: string) =>
  `${contextPrefix}${table}${itemContextSuffix}`;

export function useDatabase() {
  return useSelector(databaseContextKey) as DatabaseConfig | undefined;
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

export function QueryResultProvider({
  children,
  table,
  rows,
}: {
  children?: React.ReactNode;
  table: string;
  rows: ApiCmsRow[];
}) {
  return (
    <DataProvider name={mkQueryContextKey(table)} data={rows}>
      {children}
    </DataProvider>
  );
}

export function useTablesWithDataLoaded() {
  const env = useDataEnv();
  const tables = useTables();

  if (!env) {
    return undefined;
  }

  if (!tables) {
    return undefined;
  }

  const matchingKeys = getClosestMatchingKeys(env, itemContextSuffix);

  return tables.filter((table) =>
    matchingKeys.some((key) => mkRowContextKey(table.identifier) === key)
  );
}

export function useRow(tables?: ApiCmsTable[], table?: string) {
  const env = useDataEnv();

  if (!env) {
    return undefined;
  }

  if (!table && tables && tables.length > 0) {
    table = tables[0].identifier;
  }

  if (table) {
    return {
      table,
      row: env[mkRowContextKey(table)] as ApiCmsRow | undefined,
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
