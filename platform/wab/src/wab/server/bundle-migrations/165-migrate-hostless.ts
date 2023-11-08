import { upgradeHostlessProject, BundleMigrationType } from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

// migrates antd, antd5 hostless, plasmic-rich-components
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
