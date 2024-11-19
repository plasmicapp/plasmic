import { ensure } from "@/wab/shared/common";
import {
  AIRTABLE_META,
  AirtableDataSource,
  QueryBuilderAirtableConfig,
} from "@/wab/shared/data-sources-meta/airtable-meta";
import { DataSourceMeta } from "@/wab/shared/data-sources-meta/data-sources";
import {
  FAKE_META,
  FakeDataSource,
  QueryBuilderFakeConfig,
} from "@/wab/shared/data-sources-meta/fake-meta";
import {
  GRAPHQL_META,
  GraphqlDataSource,
} from "@/wab/shared/data-sources-meta/graphql-meta";
import {
  HTTP_META,
  HttpDataSource,
} from "@/wab/shared/data-sources-meta/http-meta";
import {
  POSTGRES_META,
  PostgresDataSource,
  QueryBuilderPostgresConfig,
} from "@/wab/shared/data-sources-meta/postgres-meta";
import {
  QueryBuilderSupabaseConfig,
  SUPABASE_META,
  SupabaseDataSource,
} from "@/wab/shared/data-sources-meta/supabase-meta";
import {
  QueryBuilderTutorialDbConfig,
  TUTORIALDB_META,
  TutorialDbDataSource,
} from "@/wab/shared/data-sources-meta/tutorialdb-meta";
import {
  ZAPIER_META,
  ZapierDataSource,
} from "@/wab/shared/data-sources-meta/zapier-meta";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { DATA_SOURCE_LOWER } from "@/wab/shared/Labels";
import { Config } from "@react-awesome-query-builder/antd";

export type GenericDataSource =
  | AirtableDataSource
  | HttpDataSource
  | GraphqlDataSource
  | SupabaseDataSource
  | PostgresDataSource
  | ZapierDataSource
  | TutorialDbDataSource
  | FakeDataSource;

const DATA_SOURCE_METAS = {
  airtable: AIRTABLE_META,
  http: HTTP_META,
  graphql: GRAPHQL_META,
  supabase: SUPABASE_META,
  postgres: POSTGRES_META,
  zapier: ZAPIER_META,
  tutorialdb: TUTORIALDB_META,
  fake: FAKE_META,
} as const;

export type DataSourceType = keyof typeof DATA_SOURCE_METAS;

export function getDataSourceMeta(type: string): DataSourceMeta {
  return ensure(
    DATA_SOURCE_METAS[type],
    () => `Unexpected ${DATA_SOURCE_LOWER} type ${type}`
  );
}

export function getAllPublicDataSourceMetas() {
  return getAllDataSourceMetas().filter(
    (meta) => !DEVFLAGS.hiddenDataSources.includes(meta.id)
  );
}

export function getAllDataSourceMetas() {
  return Object.values(DATA_SOURCE_METAS);
}

export function getAllDataSourceTypes() {
  return getAllDataSourceMetas().map((s) => s.id);
}

export const DATA_SOURCE_QUERY_BUILDER_CONFIG = {
  supabase: QueryBuilderSupabaseConfig,
  postgres: QueryBuilderPostgresConfig,
  airtable: QueryBuilderAirtableConfig,
  tutorialdb: QueryBuilderTutorialDbConfig,
  fake: QueryBuilderFakeConfig,
};

export function getDataSourceQueryBuilderConfig(type: string): Config {
  return ensure(
    DATA_SOURCE_QUERY_BUILDER_CONFIG[type],
    () => `Unexpected ${DATA_SOURCE_LOWER} type ${type}`
  );
}
