// tutorialdb is just a thin layer on top of postgres!

import type { DataSource } from "@/wab/server/entities/Entities";
import type { TutorialType } from "@/wab/server/tutorialdb/tutorialdb-utils";
import { TutorialDbId } from "@/wab/shared/ApiSchema";
import {
  DataSourceMeta,
  SettingFieldMeta,
} from "@/wab/shared/data-sources-meta/data-sources";
import {
  POSTGRES_META,
  QueryBuilderPostgresConfig,
} from "@/wab/shared/data-sources-meta/postgres-meta";

export interface TutorialDbDataSource extends DataSource {
  source: "tutorialdb";
  credentials: {
    tutorialDbId: TutorialDbId;
  };
  settings: {
    type: TutorialType;
  };
}

const TUTORIAL_TYPE: SettingFieldMeta = {
  type: "string",
  label: "Tutorial Type",
  required: true,
  placeholder: "northwind",
  description: "Enter the dir name of the tutorialdb",
  public: true,
};

export const TUTORIALDB_META: DataSourceMeta = {
  ...POSTGRES_META,
  id: "tutorialdb",
  label: "Tutorial DB",
  fieldOrder: undefined,
  credentials: {
    tutorialDbId: {
      type: "string",
      label: "Tutoral DB ID",
      required: true,
    },
  },
  settings: {
    type: TUTORIAL_TYPE,
  },
};

export const QueryBuilderTutorialDbConfig = QueryBuilderPostgresConfig;
