import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { _migrationOnlyUtil } from "@/wab/shared/core/transform-utils";

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst["__type"] === "RuleSet") {
      const values = inst["values"];
      if ("transform" in values) {
        values["transform"] = _migrationOnlyUtil.migrateTransformsValue(
          values["transform"]
        );
      }
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
