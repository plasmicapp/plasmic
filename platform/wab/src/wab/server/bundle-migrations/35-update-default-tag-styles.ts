import { ensure } from "@/wab/shared/common";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import { Bundler } from "@/wab/shared/bundler";
import { UnsafeBundle } from "@/wab/shared/bundles";
import { isKnownTplTag, TplTag } from "@/wab/shared/model/classes";
import { createDefaultTheme } from "@/wab/shared/core/sites";
import { cloneMixin, cloneThemeStyle } from "@/wab/shared/core/styles";
import { flattenTpls } from "@/wab/shared/core/tpls";

const defaultTagStyles = createDefaultTheme().styles;

/**
 * This migration updates default tag styles in latest revisions of
 * projects (it does nothing for PkgVersions). It skips styles for
 * tags that are being used in the project.
 */
export async function migrate(
  bundle: UnsafeBundle,
  db: DbMgr,
  entity: PkgVersion | ProjectRevision
) {
  if (entity instanceof PkgVersion) {
    console.log(`Skipping PkgVersion ${entity.id}.`);
    return;
  }

  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  const usedTags = new Set(
    site.components
      .flatMap((c) => flattenTpls(c.tplTree))
      .filter((t) => isKnownTplTag(t))
      .map((t) => (t as TplTag).tag)
  );

  if (!site.activeTheme) {
    console.log(`Project ${entity.id} has no activeTheme.`);
    site.activeTheme = createDefaultTheme();

    // Remove default tag styles from project - they will be added below
    // only for tags that are not being used in the project.
    site.activeTheme.styles = [];
  }

  for (const themeStyle of defaultTagStyles) {
    const [tag] = themeStyle.selector.split(":");
    if (usedTags.has(tag)) {
      // tag is being used in project; skip style.
      continue;
    }

    const activeTheme = ensure(site.activeTheme, "just created");
    const existing = activeTheme.styles.find(
      (s) => s.selector === themeStyle.selector
    );
    if (existing) {
      existing.style = cloneMixin(themeStyle.style);
    } else {
      activeTheme.styles.push(cloneThemeStyle(themeStyle));
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "35-update-default-tag-styles"
  );
  Object.assign(bundle, newBundle);
}

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
