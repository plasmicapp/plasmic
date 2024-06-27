import { ensureInstance } from "@/wab/shared/common";
import { isFrameComponent } from "@/wab/shared/core/components";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { loadDepPackages } from "@/wab/server/db/DbBundleLoader";
import { getArenaFrames } from "@/wab/shared/Arenas";
import { Bundler } from "@/wab/shared/bundler";
import {
  isKnownSite,
  ProjectDependency,
  Site,
} from "@/wab/shared/model/classes";
import { TplMgr } from "@/wab/shared/TplMgr";
import { getSiteArenas } from "@/wab/shared/core/sites";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const deps = await loadDepPackages(db, bundle);
  const bundler = new Bundler();

  deps.forEach((dep) => bundler.unbundle(JSON.parse(dep.model), dep.id));
  const siteOrProjectDep = ensureInstance(
    bundler.unbundle(bundle, entity.id),
    Site,
    ProjectDependency
  );
  const site = isKnownSite(siteOrProjectDep)
    ? siteOrProjectDep
    : siteOrProjectDep.site;

  // Remove from site.components the frame components with no corresponding
  // arena frames.
  const frames = getSiteArenas(site).flatMap((arena) => getArenaFrames(arena));
  const componentsToRemove = site.components.filter(
    (c) =>
      isFrameComponent(c) && !frames.find((f) => f.container.component === c)
  );
  if (componentsToRemove.length) {
    try {
      const tplMgr = new TplMgr({ site });
      tplMgr.removeComponentGroup(componentsToRemove);
    } catch (e) {
      console.log(`Error migrating ${entity.id}`, e);
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "27-frame-component-invariant"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
