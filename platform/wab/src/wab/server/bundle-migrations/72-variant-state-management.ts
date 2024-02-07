import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnsafeBundle } from "@/wab/shared/bundles";

export const migrate = async (bundle: UnsafeBundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "Variant") {
      delete inst["condExpr"];
      delete inst["linkedState"];
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
