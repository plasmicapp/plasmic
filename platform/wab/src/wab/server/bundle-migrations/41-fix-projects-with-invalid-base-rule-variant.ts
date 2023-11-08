import { TplNode } from "../../classes";
import { Bundler } from "../../shared/bundler";
import { ensureBaseRuleVariantSetting } from "../../shared/Variants";
import { flattenTpls, isTplVariantable } from "../../tpls";
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
