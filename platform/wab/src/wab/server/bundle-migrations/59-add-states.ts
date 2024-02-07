import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnsafeBundle } from "@/wab/shared/bundles";

export async function migrate(bundle: UnsafeBundle) {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "Component") {
      inst["states"] = [];
    }
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
