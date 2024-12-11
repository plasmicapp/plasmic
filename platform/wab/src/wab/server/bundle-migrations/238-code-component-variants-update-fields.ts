import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { Bundler } from "@/wab/shared/bundler";
import { isTplCodeComponent } from "@/wab/shared/core/tpls";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site } = await unbundleSite(bundler, bundle, db, entity);
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "Variant") {
      if (
        inst["selectors"]?.length === 1 &&
        !inst["selectors"][0].startsWith(":")
      ) {
        const comp = site.components.filter(
          (c) => c.variants.filter((v) => v.uuid === inst.uuid).length > 0
        )[0];
        if (isTplCodeComponent(comp.tplTree)) {
          inst["codeComponentVariantKeys"] = inst["selectors"].map((sel) =>
            sel.replace("$cc-variant$", "")
          );
          inst["selectors"] = null;
          inst["codeComponentName"] = comp.tplTree.component.name;
        }
      }
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
