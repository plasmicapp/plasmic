import { mkShortId } from "@/wab/shared/common";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";

export const migrate: BundledMigrationFn = async (bundle) => {
  // Ensures all tpl nodes will have a unique uuid in the project.
  // Will first run this migration, and next enforce a site invariant
  const seen = new Set<string>();
  for (const inst of Object.values(bundle.map)) {
    if (["TplTag", "TplComponent", "TplSlot"].includes(inst.__type)) {
      const uuid = inst["uuid"];
      if (seen.has(uuid)) {
        inst["uuid"] = mkShortId();
      }
      seen.add(inst["uuid"]);
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
