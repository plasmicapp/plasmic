import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnsafeBundle } from "@/wab/shared/bundles";

export async function migrate(bundle: UnsafeBundle) {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "Variant") {
      inst["name"] = inst["name"].trim();
    }
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
