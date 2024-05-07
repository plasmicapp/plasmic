import { migrate as migration72 } from "@/wab/server/bundle-migrations/72-variant-state-management";
import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";

// migrates antd
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await migration72(bundle);
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
