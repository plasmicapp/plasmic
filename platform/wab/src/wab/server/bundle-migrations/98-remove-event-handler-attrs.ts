import { isRealCodeExpr } from "@/wab/shared/core/exprs";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { Bundler } from "@/wab/shared/bundler";
import { isKnownEventHandler, isKnownVarRef } from "@/wab/shared/model/classes";
import { flattenTpls, isAttrEventHandler } from "@/wab/shared/core/tpls";

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
      for (const vs of tpl.vsettings) {
        for (const [attr, expr] of Object.entries(vs.attrs)) {
          if (
            isAttrEventHandler(attr) &&
            !isKnownEventHandler(expr) &&
            !isKnownVarRef(expr) &&
            !isRealCodeExpr(expr)
          ) {
            // event handler is just a string
            delete vs.attrs[attr];
          }
        }
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "98-remove-event-handler-attrs"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
