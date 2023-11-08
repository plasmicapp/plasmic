import { mkShortId } from "../../common";
import { BundleMigrationType } from "../db/bundle-migration-utils";
import { BundledMigrationFn } from "../db/BundleMigrator";

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "ComponentDataQuery") {
      inst["uuid"] = mkShortId();
    }
    if (inst.__type === "DataSourceOpExpr") {
      inst["parent"] = null;
      inst["queryInvalidation"] = null;
      inst["cacheKey"] = null;
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
