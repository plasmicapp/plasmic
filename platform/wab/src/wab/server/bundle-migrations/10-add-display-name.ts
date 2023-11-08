import { UnsafeBundle } from "../../shared/bundles";
import { BundleMigrationType } from "../db/bundle-migration-utils";

export async function migrate(bundle: UnsafeBundle) {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "CodeComponentMeta") {
      inst["displayName"] = null;
      inst["importName"] = null;
    }
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
