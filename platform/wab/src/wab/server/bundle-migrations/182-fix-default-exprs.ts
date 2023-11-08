import { isAllowedDefaultExpr } from "../../exprs";
import { Bundler } from "../../shared/bundler";
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
    for (const param of component.params) {
      if (param.defaultExpr && !isAllowedDefaultExpr(param.defaultExpr)) {
        param.defaultExpr = undefined;
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "182-fix-default-exprs"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
