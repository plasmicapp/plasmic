import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "VariantSetting") {
      inst["initialStateValues"] = [];
    } else if (
      ["Variant", "VariantGroup", "ComponentVariantGroup"].includes(inst.__type)
    ) {
      inst["linkedState"] = null;
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
