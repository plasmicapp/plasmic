import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "RuleSet") {
      const values = inst.values;

      if (Object.hasOwn(values, "flex-column-gap")) {
        values["column-gap"] = values["flex-column-gap"];
        delete values["flex-column-gap"];
      }

      if (Object.hasOwn(values, "flex-row-gap")) {
        values["row-gap"] = values["flex-row-gap"];
        delete values["flex-row-gap"];
      }
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
