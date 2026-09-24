import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { mkShortId } from "@/wab/shared/common";

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
