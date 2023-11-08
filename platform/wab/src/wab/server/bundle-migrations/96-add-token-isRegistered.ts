import { BundleMigrationType } from "../db/bundle-migration-utils";
import { BundledMigrationFn } from "../db/BundleMigrator";

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "StyleToken") {
      inst["isRegistered"] = false;
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
