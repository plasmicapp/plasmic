import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "PageMeta") {
      delete inst["pageDataQueries"];
    }
    if (inst.__type === "Component") {
      inst["dataQueries"] = [];
    }
    if (inst.__type === "PageDataQuery") {
      inst.__type = "ComponentDataQuery";
    }
    if (inst.__type === "DataSourceOpExpr") {
      inst["templates"] = {};
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
