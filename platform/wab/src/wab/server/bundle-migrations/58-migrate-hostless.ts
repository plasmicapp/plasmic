import { migrate as migration59 } from "@/wab/server/bundle-migrations/59-add-states";
import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";

// migrates commerce and wordpress metadata
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await migration59(bundle);
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
