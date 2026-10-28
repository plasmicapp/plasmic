import {
  extractUsedIconAssetsForComponents,
  extractUsedPictureAssetsForComponents,
} from "@/wab/shared/codegen/image-assets";
import { mergeSets } from "@/wab/shared/common";
import { Site } from "@/wab/shared/model/classes";

export function pruneUnusedImageAssets(site: Site) {
  const icons = extractUsedIconAssetsForComponents(site, site.components);
  const pictures = extractUsedPictureAssetsForComponents(
    site,
    site.components,
    { includeRuleSets: true, expandMixins: true },
  );

  const assets = mergeSets(icons, pictures);

  const unusedAssets = new Set(site.imageAssets.filter((x) => !assets.has(x)));

  site.imageAssets = site.imageAssets.filter((x) => !unusedAssets.has(x));
  return unusedAssets;
}
