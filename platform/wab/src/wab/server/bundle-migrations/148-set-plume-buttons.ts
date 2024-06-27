/**
 * Finds all Plume Buttons and adds the submitsForm param, and sets
 * the TplComponents to submitsForm=true.  submitsForm will be false
 * by default from now on, so this fixes existing Plume buttons to
 * retain their existing behavior.
 */
import { isCodeComponent } from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import { Bundler } from "@/wab/shared/bundler";
import { Arg } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { flattenTpls, isTplComponent } from "@/wab/shared/core/tpls";

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
