import { unbundleSite } from "@/wab/server/db/bundle-migration-utils";
import { getMigratedBundle } from "@/wab/server/db/BundleMigrator";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import {
  Bundler,
  checkBundleFields,
  checkExistingReferences,
  checkRefsInBundle,
} from "@/wab/shared/bundler";
import { extractComponentUsages } from "@/wab/shared/core/sites";
import { Component } from "@/wab/shared/model/classes";
import { assertSiteInvariants } from "@/wab/shared/site-invariants";
import { TplMgr } from "@/wab/shared/TplMgr";
import { EntityManager } from "typeorm";

export async function fixDuplicatedComponents(
  em: EntityManager,
  projectId: string
) {
  const dbMgr = new DbMgr(em, SUPER_USER);
  const rev = await dbMgr.getLatestProjectRev(projectId);
  const bundle = await getMigratedBundle(rev);
  const bundler = new Bundler();
  const { site } = await unbundleSite(bundler, bundle, dbMgr, rev);
  const tplMgr = new TplMgr({ site });

  const duplicatedComponents = new Map<string, Component[]>();
  for (const component of site.components) {
    const key = component.name;
    if (!duplicatedComponents.has(key)) {
      duplicatedComponents.set(key, []);
    }
    duplicatedComponents.get(key)!.push(component);
  }

  duplicatedComponents.forEach((components) => {
    if (components.length <= 1) {
      return;
    }

    // Sort in descending order. components[0] will have the most usages.
    components.sort(
      (a, b) =>
        extractComponentUsages(site, b).components.length -
        extractComponentUsages(site, a).components.length
    );
    components.forEach((component, index) => {
      if (index === 0) {
        return;
      }
      tplMgr.swapComponents(component, components[0]);
      tplMgr.removeComponent(component);
    });
  });

  const newBundle = bundler.bundle(site, rev.id, bundle.version);

  checkExistingReferences(newBundle);
  checkBundleFields(newBundle);
  checkRefsInBundle(newBundle);
  assertSiteInvariants(site);

  await dbMgr.saveProjectRev({
    projectId,
    branchId: undefined,
    data: JSON.stringify(newBundle),
    revisionNum: rev.revision + 1,
  });
}
