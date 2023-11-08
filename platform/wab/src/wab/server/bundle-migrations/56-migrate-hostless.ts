import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";
import { migrate as migration59 } from "./59-add-states";

// migrates antd and commerce metadata
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await migration59(bundle);
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
