// tutorialdb is just a thin layer on top of postgres!

import type { DataSource } from "../../server/entities/Entities";
import type { TutorialType } from "../../server/tutorialdb/tutorialdb-utils";
import { TutorialDbId } from "../ApiSchema";
import { DataSourceMeta, SettingFieldMeta } from "./data-sources";
import { POSTGRES_META, QueryBuilderPostgresConfig } from "./postgres-meta";

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
