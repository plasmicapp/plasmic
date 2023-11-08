import { upgradeHostlessProject, BundleMigrationType } from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

// migrates plasmic-rich-components, antd5 hostless
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
