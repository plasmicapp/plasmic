import { Bundler } from "../../shared/bundler";
import { isScreenVariant } from "../../shared/Variants";
import {
  BundleMigrationType,
  unbundleSite,
} from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  const nonScreenGlobalVariants = site.globalVariantGroups.flatMap(
    (variantGroup) => variantGroup.variants.filter((v) => !isScreenVariant(v))
  );
  const themeMixins = site.themes.flatMap((theme) => [
    theme.defaultStyle,
    ...theme.styles.map((themeStyle) => themeStyle.style),
  ]);
  for (const mixin of themeMixins) {
    mixin.variantedRs = mixin.variantedRs.filter(
      (variantedRs) =>
        !variantedRs.variants.some((variant) =>
          nonScreenGlobalVariants.includes(variant)
        )
    );
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "40-remove-varianted-rs-for-non-screen-global-variants"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
