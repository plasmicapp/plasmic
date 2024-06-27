import { mkShortId } from "@/wab/shared/common";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";

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
