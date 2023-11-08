import { TplComponent } from "../../classes";
import { isCodeComponent } from "../../components";
import { Bundler } from "../../shared/bundler";
import { RuleSetHelpers } from "../../shared/RuleSetHelpers";
import { tryGetBaseVariantSetting } from "../../shared/Variants";
import { flattenTpls, isTplComponent } from "../../tpls";
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

  for (const component of site.components) {
    for (const tpl of flattenTpls(component.tplTree).filter(
      (t): t is TplComponent =>
        isTplComponent(t) &&
        isCodeComponent(t.component) &&
        t.component.codeComponentMeta.importName === "CmsRowField" &&
        t.component.codeComponentMeta.importPath === "@plasmicpkgs/plasmic-cms"
    )) {
      const baseVariantSetting = tryGetBaseVariantSetting(tpl);
      if (!baseVariantSetting) {
        continue;
      }

      const rsh = new RuleSetHelpers(baseVariantSetting.rs, "div");
      const value = rsh.getRaw("object-fit");
      if (!value) {
        rsh.set("object-fit", "cover");
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "89-cms-entry-field-object-fit"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
