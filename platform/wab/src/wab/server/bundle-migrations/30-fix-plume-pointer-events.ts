import { TplNode } from "../../classes";
import { Bundler } from "../../shared/bundler";
import { RSH } from "../../shared/RuleSetHelpers";
import { flattenTpls, isTplNamable, isTplVariantable } from "../../tpls";
import {
  BundleMigrationType,
  unbundleSite,
} from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

/**
 * This is fixing https://app.shortcut.com/plasmic/story/20351/urgent-plume-button-component-click-not-working
 * by removing errant `pointer-event:none` styles in Plume components for
 * button, select, and text-input.
 */
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  for (const component of site.components) {
    if (!component.plumeInfo) {
      continue;
    }

    if (component.plumeInfo.type === "button") {
      removePointerEventsFromAllVariants(component.tplTree);
    } else if (component.plumeInfo.type === "select") {
      const trigger = flattenTpls(component.tplTree).find(
        (tpl) => isTplNamable(tpl) && tpl.name === "trigger"
      );
      if (trigger) {
        removePointerEventsFromAllVariants(trigger);
      }
    } else if (component.plumeInfo.type === "text-input") {
      removePointerEventsFromAllVariants(component.tplTree);
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "30-fix-plume-pointer-events"
  );
  Object.assign(bundle, newBundle);
};

function removePointerEventsFromAllVariants(tpl: TplNode) {
  if (isTplVariantable(tpl)) {
    for (const vs of tpl.vsettings) {
      const rsh = RSH(vs.rs, tpl);
      if (rsh.has("pointer-events")) {
        rsh.clear("pointer-events");
      }
    }
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
