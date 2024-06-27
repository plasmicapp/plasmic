import { codeLit } from "@/wab/shared/core/exprs";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import { Bundler } from "@/wab/shared/bundler";
import { Arg, isKnownTplComponent } from "@/wab/shared/model/classes";
import { flattenTpls } from "@/wab/shared/core/tpls";
import { formComponentName } from "@plasmicpkgs/antd5";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  const projectId = "pkg" in entity ? entity.pkg?.projectId : entity.projectId;
  for (const component of site.components) {
    for (const tpl of flattenTpls(component.tplTree)) {
      if (
        !isKnownTplComponent(tpl) ||
        tpl.component.name !== formComponentName
      ) {
        continue;
      }
      const baseVs = ensureBaseVariantSetting(tpl);
      const modeParam = tpl.component.params.find(
        (p) => p.variable.name === "mode"
      );
      if (!modeParam) {
        console.log(`mode param not found in project: ${projectId}`);
        continue;
      }
      const modeArg = baseVs.args.find(
        (arg) => arg.param.variable.name === modeParam.variable.name
      );
      const formItemsArg = baseVs.args.find(
        (arg) => arg.param.variable.name === "formItems"
      );
      if (formItemsArg) {
        // if the user updated the formItems prop, we assume that they were already using the simplified mode.
        continue;
      }
      if (!modeArg) {
        // set to undefined
        baseVs.args.push(
          new Arg({
            param: modeParam,
            expr: codeLit(undefined),
          })
        );
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "163-fix-simplified-mode"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
