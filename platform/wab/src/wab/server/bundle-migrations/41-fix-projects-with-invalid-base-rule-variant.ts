import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { ensureBaseRuleVariantSetting } from "@/wab/shared/Variants";
import { Bundler } from "@/wab/shared/bundler";
import { TplNode } from "@/wab/shared/model/classes";
import { flattenTpls, isTplVariantable } from "@/wab/shared/core/tpls";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  site.components
    .filter((c) => isTplVariantable(c.tplTree))
    .forEach((c) => {
      flattenTpls(c.tplTree).forEach((tpl) => {
        if (isTplVariantable(tpl)) {
          tpl.vsettings.forEach((vs) => {
            ensureBaseRuleVariantSetting(
              tpl,
              vs.variants,
              c.tplTree as TplNode
            );
          });
        }
      });
    });

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "41-fix-projects-with-invalid-base-rule-variant"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
