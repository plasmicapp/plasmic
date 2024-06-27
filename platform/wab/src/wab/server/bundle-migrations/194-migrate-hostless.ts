import { ensure } from "@/wab/shared/common";
import { clone } from "@/wab/shared/core/exprs";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
  upgradeHostlessProject,
} from "@/wab/server/db/bundle-migration-utils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import { Bundler } from "@/wab/shared/bundler";
import { isKnownDataSourceOpExpr } from "@/wab/shared/model/classes";
import { flattenTpls, isTplCodeComponent } from "@/wab/shared/core/tpls";
import { formComponentName } from "@plasmicpkgs/antd5";

// migrates antd5 hostless, plasmic-rich-components
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
  if (db.isDevBundle) {
    return;
  }
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  const tplMgr = new TplMgr({ site });
  for (const component of site.components) {
    for (const tpl of flattenTpls(component.tplTree)) {
      if (
        !isTplCodeComponent(tpl) ||
        tpl.component.name !== formComponentName
      ) {
        continue;
      }
      const dataParam = ensure(
        tpl.component.params.find((p) => p.variable.name === "data"),
        "forms should have a data param"
      );
      const dataFormItemsParam = ensure(
        tpl.component.params.find((p) => p.variable.name === "dataFormItems"),
        "forms should have a data form items param"
      );
      const baseVs = ensureBaseVariantSetting(tpl);
      const schemaModeArg = baseVs.args.find(
        (arg) => arg.param.variable.name === "data"
      );
      if (!schemaModeArg || !isKnownDataSourceOpExpr(schemaModeArg.expr)) {
        // it's not a schema form
        continue;
      }
      for (const vs of tpl.vsettings) {
        const formItemsArg = baseVs.args.find(
          (arg) => arg.param.variable.name === "formItems"
        );
        const dataFormItemsArg = baseVs.args.find(
          (arg) => arg.param.variable.name === "dataFormItems"
        );
        if (!formItemsArg || !!dataFormItemsArg) {
          continue;
        }
        // we need to copy to the new dataFormItems prop
        tplMgr.setArg(
          tpl,
          vs,
          dataFormItemsParam.variable,
          clone(formItemsArg.expr)
        );
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "194-migrate-hostless"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
