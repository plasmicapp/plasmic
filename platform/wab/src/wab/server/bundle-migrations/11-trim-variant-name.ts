import { UnsafeBundle } from "../../shared/bundles";
import { BundleMigrationType } from "../db/bundle-migration-utils";

export async function migrate(bundle: UnsafeBundle) {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "Variant") {
      inst["name"] = inst["name"].trim();
    }
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
