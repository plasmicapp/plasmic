import { UnsafeBundle } from "../../shared/bundles";
import { BundleMigrationType } from "../db/bundle-migration-utils";

export const migrate = async (bundle: UnsafeBundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "Variant") {
      delete inst["condExpr"];
      delete inst["linkedState"];
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
