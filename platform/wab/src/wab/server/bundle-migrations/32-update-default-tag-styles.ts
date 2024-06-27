import { ensure } from "@/wab/shared/common";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { ProjectRevision } from "@/wab/server/entities/Entities";
import { Bundler } from "@/wab/shared/bundler";
import { isKnownTplTag, TplTag } from "@/wab/shared/model/classes";
import { createDefaultTheme } from "@/wab/shared/core/sites";
import { cloneMixin, cloneThemeStyle } from "@/wab/shared/core/styles";
import { flattenTpls } from "@/wab/shared/core/tpls";

const ids = new Set([
  // Projects in "Starter projects" workspace and their pkgs.
  "euZipmXYVJ8mwVgFeFc5L5",
  "26M4XssRY4W52SZG1ZxtG5",
  "3SwC2F4BeXucfS9cpFbd24",
  "iYCLUNn8WMpw1U62MWQZGm",
  "cvXUzqk57WomqvTqXQ1QYL",
  "qGzUYrSXGh2G1seMTJAame",
  "wDHK8xohJTQMyVDcVMDaJH",
  "rimshGbkWB5wYc3b5NM51o",
  "9ye9HxcNMEmzjJpErUD7ih",
  "QjRHpHmEJ32NBpDRFrUUm",
  "b49KPkrvPCTnVu1XmBGo7j",
  "bT6dMi84CLhP3ovSWmvZH8",
  "qHHB9UthLR9FiAbZWsXhER",
  "55A93f171M8gjeFzAjQ9wx",
  "d1YxdDF84AwJPcved6P9XK",
  "iYAHDaeAh2Sbj8TXwKwAHH",
  "aPZu6epBt5EaEYRgMF1d6z",
  "u5zYiaJQ9ApMEy78K5vori",
  "vP9xXLvZ7Ms4GyJbDi1yom",
  "0ebf2464-51c9-4bd1-a6b8-d5f0b6c236f7",
  "cd919620-d87d-4f9d-b18d-94edfaecb99b",
  "729c73e5-48bd-4251-9c4b-a02d50c40afb",
  "78ee2c47-e9a3-4b88-b8a7-920465e44233",
  "c0ba1343-c0ef-49c8-aaa5-f003f81a43dd",
  "2215d6d2-5dbe-4c34-a712-0851c65f48ab",
  "8b5b9ead-4b37-4177-8e5e-ff0291e8faa0",
  "98505ca5-add3-49fc-b065-4bfe5828e697",
  "87fda7bb-f557-480f-8904-472f6df90a44",
  "9d944cbf-a299-4804-9acb-772d46c61399",
  "7818aa55-ad1b-4cf6-95c5-5450d24a07ab",
  "ec37229f-1836-43e7-bb72-88d0c5f6125c",
  "90ed88ae-b310-44fd-a8e2-0ab43e5a02c4",
  "6ac5f8b0-2214-4b0d-aa0a-4dc96ec60004",
  "cfc9d93a-dd88-4460-af01-bdc7871effc4",
  "63b9a9a5-7235-4b02-a8d1-05e08b088f0e",
]);

const defaultTagStyles = createDefaultTheme().styles;

/**
 * This migration updates default tag styles in starter projects. It skips
 * tags that are being used in the project.
 */
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const projectOrPkgId =
    entity instanceof ProjectRevision ? entity.projectId : entity.pkgId;
  if (!ids.has(projectOrPkgId)) {
    console.log(`Skipping ${projectOrPkgId}`);
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

  for (const themeStyle of defaultTagStyles) {
    const [tag] = themeStyle.selector.split(":");
    if (usedTags.has(tag)) {
      // tag is being used in project; skip style.
      continue;
    }

    const activeTheme = ensure(site.activeTheme, "already created it");
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
    "32-update-default-tag-styles"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
