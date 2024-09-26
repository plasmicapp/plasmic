import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { pseudoSelectors } from "@/wab/shared/core/styles";

const presetDisplayNamesToCssSelectors = new Map(
  pseudoSelectors.map((opt) => [opt.displayName, opt.cssSelector])
);

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (
      !(inst["__type"] === "Variant" && inst["selectors"] && inst["forTpl"])
    ) {
      continue;
    }

    const newSelectors = inst["selectors"].map(
      (maybeDisplayName) =>
        presetDisplayNamesToCssSelectors.get(maybeDisplayName) ??
        maybeDisplayName
    );
    inst["selectors"] = newSelectors;
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
