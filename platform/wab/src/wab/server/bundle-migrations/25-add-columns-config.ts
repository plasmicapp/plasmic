import { ensure, ensureInstance } from "@/wab/shared/common";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { loadDepPackages } from "@/wab/server/db/DbBundleLoader";
import { Bundler } from "@/wab/shared/bundler";
import {
  equalColumnDistribution,
  hasMaxWidthVariant,
} from "@/wab/shared/columns-utils";
import {
  ColumnsConfig,
  isKnownTplTag,
  ProjectDependency,
  Site,
} from "@/wab/shared/model/classes";
import {
  tryGetBaseVariantSetting,
  tryGetVariantSetting,
} from "@/wab/shared/Variants";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const tplIids: string[] = [];
  for (const [iid, json] of Object.entries(bundle.map)) {
    if (json.__type === "TplTag") {
      tplIids.push(iid);
    }
    if (json.__type === "VariantSetting") {
      json["columnsConfig"] = undefined;
    }
  }

  const deps = await loadDepPackages(db, bundle);
  const bundler = new Bundler();

  deps.forEach((dep) => bundler.unbundle(JSON.parse(dep.model), dep.id));
  const siteOrProjectDep = ensureInstance(
    bundler.unbundle(bundle, entity.id),
    Site,
    ProjectDependency
  );

  for (const iid of tplIids) {
    const tpl = bundler.objByAddr({ iid, uuid: entity.id });
    if (tpl) {
      if (isKnownTplTag(tpl)) {
        if (tpl.type === "columns") {
          // Add columns config, but don't update the width of the elements so that
          // the children aren't updated, but when the user tries to use it,
          // automatically updates
          const baseVS = ensure(
            tryGetBaseVariantSetting(tpl),
            "must have baseVs"
          );

          const desktopConfig = new ColumnsConfig({
            breakUpRows: tpl.children.length > 12,
            colsSizes: equalColumnDistribution(
              Math.min(tpl.children.length, 12)
            ),
          });
          const mobileConfig = new ColumnsConfig({
            breakUpRows: true,
            colsSizes: [12],
          });
          if (tpl.columnsSetting?.screenBreakpoint) {
            const isBaseColumn = !hasMaxWidthVariant(
              tpl.columnsSetting.screenBreakpoint
            );
            const screenVS = tryGetVariantSetting(tpl, [
              tpl.columnsSetting.screenBreakpoint,
            ]);
            if (screenVS) {
              baseVS.columnsConfig = new ColumnsConfig(
                isBaseColumn ? mobileConfig : desktopConfig
              );
              screenVS.columnsConfig = new ColumnsConfig(
                !isBaseColumn ? mobileConfig : desktopConfig
              );
            } else {
              baseVS.columnsConfig = desktopConfig;
            }
          } else {
            baseVS.columnsConfig = desktopConfig;
          }
        }
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "25-add-columns-config"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
