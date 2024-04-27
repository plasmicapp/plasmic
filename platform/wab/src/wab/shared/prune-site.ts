import { Site } from "@/wab/classes";
import { mergeSets, removeWhere } from "@/wab/common";
import {
  extractUsedIconAssetsForComponents,
  extractUsedPictureAssetsForComponents,
} from "@/wab/shared/codegen/image-assets";
import { isVariantSettingEmpty } from "@/wab/shared/Variants";

export function pruneUnusedImageAssets(site: Site) {
  const icons = extractUsedIconAssetsForComponents(site, site.components);
  const pictures = extractUsedPictureAssetsForComponents(
    site,
    site.components,
    { includeRuleSets: true, expandMixins: true }
  );

  const assets = mergeSets(icons, pictures);

  const unusedAssets = new Set(site.imageAssets.filter((x) => !assets.has(x)));

  removeWhere(site.imageAssets, (x) => unusedAssets.has(x));
  return unusedAssets;
}

export function pruneUnusedVariantSettings(site: Site) {
  isVariantSettingEmpty;
}
