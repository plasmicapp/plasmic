/**
 * Finds all Plume Buttons and adds the submitsForm param, and sets
 * the TplComponents to submitsForm=true.  submitsForm will be false
 * by default from now on, so this fixes existing Plume buttons to
 * retain their existing behavior.
 */
import { Arg } from "../../classes";
import { isCodeComponent } from "../../components";
import { codeLit } from "../../exprs";
import { mkParam } from "../../lang";
import { Bundler } from "../../shared/bundler";
import { typeFactory } from "../../shared/core/model-util";
import { ensureBaseVariantSetting } from "../../shared/Variants";
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

  const plumeButtons = site.components.filter(
    (comp) => comp.plumeInfo?.type === "button"
  );

  for (const comp of plumeButtons) {
    let param = comp.params.find((p) => p.variable.name === "submitsForm");

    if (!param) {
      // If no param exists, then add it directly
      param = mkParam({
        name: "submitsForm",
        type: typeFactory.bool(),
        paramType: "prop",
      });
      comp.params.push(param);
    }
    const tpls = site.components
      .filter((c) => !isCodeComponent(c))
      .flatMap((c) =>
        flattenTpls(c.tplTree)
          .filter(isTplComponent)
          .filter((t) => t.component === comp)
      );
    for (const tpl of tpls) {
      const baseVs = ensureBaseVariantSetting(tpl);
      const arg = baseVs.args.find((ag) => ag.param === param);
      if (!arg) {
        // If nothing specified so far, then explicitly set it to
        // true to preserve previous behavior
        baseVs.args.push(
          new Arg({
            param,
            expr: codeLit(true),
          })
        );
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "148-set-plume-buttons"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
