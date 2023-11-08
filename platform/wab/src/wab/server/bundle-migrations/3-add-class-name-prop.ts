import { UnsafeBundle } from "../../shared/bundles";
import { BundleMigrationType } from "../db/bundle-migration-utils";

export function migrate(bundle: UnsafeBundle) {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "CodeComponentMeta") {
      inst["classNameProp"] = null;
    }
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
