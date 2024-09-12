import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "CodeComponentMeta" && inst["interactionVariantMeta"]) {
      inst["variants"] = inst["interactionVariantMeta"];
      delete inst["interactionVariantMeta"];
    }
    if (inst.__type === "Variant" && Array.isArray(inst["selectors"])) {
      inst["selectors"] = inst["selectors"].map((sel) =>
        sel.replace("cc-interaction", "cc-variant")
      );
    }
    if (inst.__type === "CodeComponentInteractionVariantMeta") {
      inst["__type"] = "CodeComponentVariantMeta";
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
