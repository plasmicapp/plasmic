import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { Bundler } from "@/wab/shared/bundler";
import {
  isKnownDataSourceOpExpr,
  TemplatedString,
} from "@/wab/shared/model/classes";
import { flattenTpls, isTplCodeComponent } from "@/wab/shared/core/tpls";
import { formComponentName } from "@plasmicpkgs/antd5";

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
