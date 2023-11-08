import { formComponentName } from "@plasmicpkgs/antd5";
import { Arg, isKnownTplComponent } from "../../classes";
import { codeLit } from "../../exprs";
import { ensureBaseVariantSetting } from "../../shared/Variants";
import { Bundler } from "../../shared/bundler";
import { flattenTpls } from "../../tpls";
import { UnbundledMigrationFn } from "../db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
} from "../db/bundle-migration-utils";

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
