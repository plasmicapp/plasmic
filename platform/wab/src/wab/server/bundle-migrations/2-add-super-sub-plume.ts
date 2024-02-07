import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnsafeBundle } from "@/wab/shared/bundles";

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
