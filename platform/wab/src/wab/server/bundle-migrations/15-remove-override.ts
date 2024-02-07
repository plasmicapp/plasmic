import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnsafeBundle } from "@/wab/shared/bundles";

export function migrate(bundle: UnsafeBundle) {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "VariantSetting") {
      delete inst["override"];
    }
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
