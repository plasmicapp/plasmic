import { BundleMigrationType } from "../db/bundle-migration-utils";
import { BundledMigrationFn } from "../db/BundleMigrator";

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const [iid, inst] of Object.entries(bundle.map)) {
    if (inst.__type === "Site") {
      delete inst["focusedFrameArenas"];
    }
    if (inst.__type === "FocusedFrameArena") {
      delete bundle.map[iid];
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
