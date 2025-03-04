import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import { Bundler } from "@/wab/shared/bundler";
import * as tpls from "@/wab/shared/core/tpls";
import { isTplVariantable } from "@/wab/shared/core/tpls";
import { toVariantKey } from "@/wab/shared/Variants";
import { isEmpty } from "lodash";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  let hasBundleChanged = false;
  const dupNonEmptyRsVariantSettingsSet = new Set();

  for (const component of site.components) {
    for (const tpl of tpls.flattenTpls(component.tplTree)) {
      const dupEmptyRsVariantSettings = new Set();
      const seenVariantsCombo: Set<string> = new Set();

      if (isTplVariantable(tpl)) {
        for (const vs of tpl.vsettings) {
          const variantKeys = vs.variants.map((v) => toVariantKey(v));
          const combinationKey = variantKeys.sort().join("|");

          // Check if it's a duplicate VariantSettings
          if (seenVariantsCombo.has(combinationKey)) {
            // Check if the RuleSet is empty
            if (isEmpty(vs.rs.values) && isEmpty(vs.rs.mixins)) {
              dupEmptyRsVariantSettings.add(vs);
            } else {
              dupNonEmptyRsVariantSettingsSet.add(vs);
            }
          } else {
            seenVariantsCombo.add(combinationKey);
          }
        }

        if (dupEmptyRsVariantSettings.size > 0) {
          tpl.vsettings = tpl.vsettings.filter(
            (vs) => !dupEmptyRsVariantSettings.has(vs)
          );
          hasBundleChanged = true;
        }
      }
    }
  }

  const pkgProjectId =
    entity instanceof PkgVersion ? entity.pkg?.projectId : "";
  const projectId =
    entity instanceof ProjectRevision ? entity.projectId : pkgProjectId;

  if (hasBundleChanged) {
    if (dupNonEmptyRsVariantSettingsSet.size > 0) {
      // duplicate issue still exists even after removing the empty RS
      console.log(
        `MIGRATION_DUP_VS_ISSUE_EXISTS: PROJECT=${projectId} has duplicate VariantSettings with non-empty RuleSet.`
      );
    } else {
      console.log(
        `MIGRATION_DUP_VS_ISSUE_RESOLVED: PROJECT=${projectId} has no more duplicate VariantSettings.`
      );
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "242-remove-duplicate-variants"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
