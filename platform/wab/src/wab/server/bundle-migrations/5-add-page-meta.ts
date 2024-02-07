import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnsafeBundle } from "@/wab/shared/bundles";

export async function migrate(bundle: UnsafeBundle) {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "PageMeta") {
      inst["description"] = "";
      inst["openGraphImage"] = null;
    }
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
