import { UnsafeBundle } from "../../shared/bundles";
import { BundleMigrationType } from "../db/bundle-migration-utils";

export async function migrate(bundle: UnsafeBundle) {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "PageMeta") {
      inst["canonical"] = null;
    }
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
