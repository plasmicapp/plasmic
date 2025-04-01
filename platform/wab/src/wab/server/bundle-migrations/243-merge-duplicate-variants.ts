import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import { Bundler } from "@/wab/shared/bundler";
import * as tpls from "@/wab/shared/core/tpls";
import { isTplColumns, isTplVariantable } from "@/wab/shared/core/tpls";
import { Site, Variant, VariantSetting } from "@/wab/shared/model/classes";
import { TplMgr } from "@/wab/shared/TplMgr";
import { toVariantKey } from "@/wab/shared/Variants";

function checkDuplicateVsExists(site: Site) {
  const duplicatesSet = new Set();

  for (const component of site.components) {
    for (const tpl of tpls.flattenTpls(component.tplTree)) {
      const seenVariantsCombo: Set<string> = new Set();

      if (isTplVariantable(tpl)) {
        for (const vs of tpl.vsettings) {
          const variantKeys = vs.variants.map((v) => toVariantKey(v));
          const combinationKey = variantKeys.sort().join("|");

          if (seenVariantsCombo.has(combinationKey)) {
            duplicatesSet.add(vs);
          } else {
            seenVariantsCombo.add(combinationKey);
          }
        }
      }
    }
  }

  return duplicatesSet.size > 0;
}

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  let hasBundleChanged = false;

  for (const component of site.components) {
    for (const tpl of tpls.flattenTpls(component.tplTree)) {
      const variantComboMap = new Map<string, VariantSetting[]>();

      if (isTplVariantable(tpl)) {
        for (const vs of tpl.vsettings) {
          const variantKeys = vs.variants.map((v) => toVariantKey(v));
          const combinationKey = variantKeys.sort().join("|");

          if (!variantComboMap.has(combinationKey)) {
            variantComboMap.set(combinationKey, []);
          }
          variantComboMap.get(combinationKey)!.push(vs);
        }

        const mergedVsettings: VariantSetting[] = [];
        let duplicatesMerged = false;

        for (const [
          _combinationKey,
          variantSettingsGroup,
        ] of variantComboMap.entries()) {
          if (variantSettingsGroup.length === 1) {
            mergedVsettings.push(variantSettingsGroup[0]);
          } else {
            duplicatesMerged = true;

            /* 1. For VariantSettings→RuleSet
                a. if same key in rs.values then keep the property from the last duplicated VS
                b. if first one has a property and the last one doesn’t then add the property to the last one
                c. if the last one has a property and the first one doesn’t then keep the property in the last one
              2. For VariantSettings→RuleSet→Mixins
                a. We need to do the same merging with the Mixins RS values as well, but we don’t want to merge Mixins, instead we need to order them correctly to get same outcome.
                b. Last duplicate VS → mixins overrides the first duplicate VS → mixins if properties are same, otherwise properties come from both of them.
                c. We need to order them as follows
                  i. [...duplicateVs.rs.mixins, ...lastDuplicateVs.rs.mixins]
             */

            const lastVs =
              variantSettingsGroup[variantSettingsGroup.length - 1];
            const duplicates = variantSettingsGroup.slice(0, -1).reverse();

            for (const dupVs of duplicates) {
              if (dupVs.rs.values && Object.keys(dupVs.rs.values).length > 0) {
                if (!lastVs.rs.values) {
                  lastVs.rs.values = {};
                }

                // Add keys from duplicate if they don't exist in the last variant setting
                Object.keys(dupVs.rs.values).forEach((key) => {
                  if (!(key in lastVs.rs.values)) {
                    lastVs.rs.values[key] = dupVs.rs.values[key];
                  }
                });
              }

              // For mixins, we want duplicates' mixins to come first, followed by last mixins
              if (dupVs.rs.mixins && dupVs.rs.mixins.length > 0) {
                if (!lastVs.rs.mixins) {
                  lastVs.rs.mixins = [...dupVs.rs.mixins];
                } else {
                  lastVs.rs.mixins = [...dupVs.rs.mixins, ...lastVs.rs.mixins];
                }
              }
            }

            mergedVsettings.push(lastVs);
          }
        }

        if (duplicatesMerged) {
          hasBundleChanged = true;
          tpl.vsettings = mergedVsettings;
        }
      }
    }
  }

  // Fix duplicate variants
  for (const component of site.components) {
    const dupVariantsMap = new Map<string, Variant[]>();
    for (const variant of component.variants) {
      const variantKey = toVariantKey(variant);

      const dupVariants = dupVariantsMap.get(variantKey) ?? [];
      dupVariantsMap.set(variantKey, [...dupVariants, variant]);
    }

    const dupVariantOwnerMap = new Map<Variant, Variant>();
    for (const [_dupKey, variants] of dupVariantsMap.entries()) {
      if (variants.length <= 1) {
        continue;
      }

      const ownerVariant = variants[0];
      const variantsToBeRemoved = variants.slice(1);
      for (const variant of variantsToBeRemoved) {
        dupVariantOwnerMap.set(variant, ownerVariant);
      }
    }

    // Replace variants in tpls
    for (const tpl of tpls.flattenTpls(component.tplTree)) {
      // Replace duplicate variant references inside VariantSettings.
      if (isTplVariantable(tpl)) {
        for (const vs of tpl.vsettings) {
          const vsFinalVariants: Variant[] = [];
          for (const vsVariant of vs.variants) {
            const ownerVariant = dupVariantOwnerMap.get(vsVariant);
            if (ownerVariant) {
              vsFinalVariants.push(ownerVariant);
            } else {
              vsFinalVariants.push(vsVariant);
            }
          }

          vs.variants = vsFinalVariants;
        }
      }

      // Replace duplicate variant references inside column settings.
      if (isTplColumns(tpl) && tpl.columnsSetting?.screenBreakpoint) {
        const ownerVariant = dupVariantOwnerMap.get(
          tpl.columnsSetting.screenBreakpoint
        );
        if (ownerVariant) {
          tpl.columnsSetting.screenBreakpoint = ownerVariant;
        }
      }
    }

    // Remove duplicate variants
    const tplMgr = new TplMgr({ site });
    for (const [dupVariant, _] of dupVariantOwnerMap.entries()) {
      tplMgr.tryRemoveVariant(dupVariant, component);
    }
  }

  const pkgProjectId =
    entity instanceof PkgVersion ? entity.pkg?.projectId : "";
  const projectId =
    entity instanceof ProjectRevision ? entity.projectId : pkgProjectId;

  if (hasBundleChanged) {
    if (checkDuplicateVsExists(site)) {
      console.log(
        `MIGRATION_VS_ISSUE_EXISTS_AFTER_MERGE: PROJECT=${projectId} has still duplicate VariantSettings after merging.`
      );
    } else {
      console.log(
        `MIGRATION_VS_ISSUE_RESOLVED_AFTER_MERGE: PROJECT=${projectId} has no more duplicate VariantSettings after merging.`
      );
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "243-merge-duplicate-variants"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
