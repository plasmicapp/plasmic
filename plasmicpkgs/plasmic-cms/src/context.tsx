import React from "react";
import {
  DataProvider,
  useSelector,
} from "@plasmicpkgs/plasmic-basic-components";
import { DatabaseConfig } from "./api";
import { ApiCmsRow, ApiCmsTable } from "./schema";

const contextPrefix = "__plasmic_cms";
const databaseContextKey = `${contextPrefix}_database`;
const tablesContextKey = `${contextPrefix}_tables`;
const mkQueryContextKey = (table: string) => `${contextPrefix}_query_${table}`;
const mkRowContextKey = (table: string) => `${contextPrefix}_row_${table}`;

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
    <DataProvider name={databaseContextKey} data={config}>
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
  tables: ApiCmsTable[];
}) {
  return (
    <DataProvider name={tablesContextKey} data={tables}>
      {children}
    </DataProvider>
  );
}

export function useQuery(table: string) {
  return useSelector(mkQueryContextKey(table)) as ApiCmsRow[] | undefined;
}

export function QueryProvider({
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

export function useRow(table: string) {
  return useSelector(mkRowContextKey(table)) as ApiCmsRow | undefined;
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
