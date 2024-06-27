import { getComponentDisplayName } from "@/wab/shared/core/components";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { Bundler } from "@/wab/shared/bundler";
import { TplMgr } from "@/wab/shared/TplMgr";
import { isPrivateState } from "@/wab/shared/core/states";
import { flattenTpls, isTplComponent } from "@/wab/shared/core/tpls";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
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
      if (isTplComponent(tpl)) {
        if (!tpl.name && tpl.component.states.some((s) => !isPrivateState(s))) {
          tplMgr.renameTpl(
            component,
            tpl,
            getComponentDisplayName(tpl.component)
          );
        }
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "88-name-stateful-tpl-components"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
