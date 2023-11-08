import { UnsafeBundle } from "../../shared/bundles";
import { BundleMigrationType } from "../db/bundle-migration-utils";

export function migrate(bundle: UnsafeBundle) {
  for (const [key, value] of Object.entries(bundle.map)) {
    if (value.__type === "Component") {
      value.superComp = null;
      value.subComps = [];
      value.plumeInfo = null;
    }
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
