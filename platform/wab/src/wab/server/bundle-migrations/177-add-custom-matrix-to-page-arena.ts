import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { mkShortId } from "@/wab/shared/common";

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "PageArena") {
      const iid = mkShortId();
      bundle.map[`${iid}`] = {
        __type: "ArenaFrameGrid",
        rows: [],
      };
      inst["customMatrix"] = {
        __ref: iid,
      };
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
