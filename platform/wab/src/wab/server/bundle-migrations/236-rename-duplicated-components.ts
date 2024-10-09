import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { Bundler } from "@/wab/shared/bundler";
import { isCodeComponent } from "@/wab/shared/core/components";
import { extractComponentUsages } from "@/wab/shared/core/sites";
import { Component } from "@/wab/shared/model/classes";
import { TplMgr } from "@/wab/shared/TplMgr";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  const duplicatedComponents = new Map<string, Component[]>();
  for (const component of site.components) {
    const key = component.name;
    // Do not count code components or  sub components as duplicates.
    if (isCodeComponent(component) || component.superComp) {
      continue;
    }
    if (!duplicatedComponents.has(key)) {
      duplicatedComponents.set(key, []);
    }
    duplicatedComponents.get(key)!.push(component);
  }

  const tplMgr = new TplMgr({ site });
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
      component.name = tplMgr.getUniqueComponentName(component.name);
    });
  });

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "236-rename-duplicated-components"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
