import { formComponentName } from "@plasmicpkgs/antd5";
import { isKnownDataSourceOpExpr, TemplatedString } from "../../classes";
import { Bundler } from "../../shared/bundler";
import { flattenTpls, isTplCodeComponent } from "../../tpls";
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
    for (const tpl of flattenTpls(component.tplTree)) {
      if (
        !isTplCodeComponent(tpl) ||
        tpl.component.name !== formComponentName
      ) {
        continue;
      }
      for (const vs of tpl.vsettings) {
        for (const arg of vs.args) {
          if (
            arg.param.variable.name !== "data" ||
            !isKnownDataSourceOpExpr(arg.expr) ||
            !!arg.expr.cacheKey
          ) {
            continue;
          }
          arg.expr.cacheKey = new TemplatedString({
            text: [arg.expr.opName],
          });
        }
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "179-add-cache-key-to-schema-forms"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
