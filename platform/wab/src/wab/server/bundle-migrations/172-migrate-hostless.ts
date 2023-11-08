import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";
import { migrate as migrate175 } from "./175-refactor-data-model";

// migrates plasmic-rich-components
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await migrate175(bundle, db, entity);
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
