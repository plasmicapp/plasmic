/**
 * Like 148, but deals with imported buttons too
 */
import { Arg } from "../../classes";
import { codeLit } from "../../exprs";
import { Bundler } from "../../shared/bundler";
import { TplMgr } from "../../shared/TplMgr";
import { ensureBaseVariantSetting } from "../../shared/Variants";
import { isTplComponent } from "../../tpls";
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

  const allTplComps = new TplMgr({ site }).filterAllNodes(isTplComponent);
  for (const tpl of allTplComps) {
    if (
      tpl.component.plumeInfo?.type === "button" &&
      !site.components.includes(tpl.component)
    ) {
      // We only look at Plume components that were imported, as those that were
      // not imported were already taken care of in 148
      const param = tpl.component.params.find(
        (p) => p.variable.name === "submitsForm"
      );
      if (param) {
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
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "149-set-plume-buttons-again"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
