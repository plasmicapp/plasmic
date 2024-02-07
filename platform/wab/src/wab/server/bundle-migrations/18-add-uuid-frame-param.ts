import { mkShortId } from "@/wab/common";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnsafeBundle } from "@/wab/shared/bundles";

export async function migrate(bundle: UnsafeBundle) {
  for (const inst of Object.values(bundle.map)) {
    if (["ArenaFrame", "Param"].includes(inst.__type)) {
      inst["uuid"] = mkShortId();
    }
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
