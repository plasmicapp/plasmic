import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";
import { migrate as migration72 } from "./72-variant-state-management";

// migrates antd
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await migration72(bundle);
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
