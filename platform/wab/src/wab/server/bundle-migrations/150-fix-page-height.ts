/**
 * Like 148, but deals with imported buttons too
 */
import { isPageComponent } from "@/wab/shared/core/components";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { Bundler } from "@/wab/shared/bundler";
import { RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  // Exclude projects made by d9fada01-9764-4ee8-8e1f-ad4b67925ef3
  // who do make use of hug heights
  if (entity.createdById !== "d9fada01-9764-4ee8-8e1f-ad4b67925ef3") {
    for (const comp of site.components.filter(isPageComponent)) {
      const baseVs = ensureBaseVariantSetting(comp.tplTree);
      const rsh = new RuleSetHelpers(baseVs.rs, "div");
      rsh.set("height", "stretch");
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "150-fix-page-height"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
