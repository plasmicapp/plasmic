import type { ImageUploadResponse } from "@/wab/shared/ApiSchema";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { ImageExportOpts } from "@/wab/shared/codegen/types";
import { jsLiteral, toVarName } from "@/wab/shared/codegen/util";
import { maybe } from "@/wab/shared/common";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { ASPECT_RATIO_SCALE_FACTOR } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { ImageAsset } from "@/wab/shared/model/classes";

export function makeImportedPictureRef(asset: ImageAsset) {
  return `${toVarName(`${asset.name}-${asset.uuid}`)}`;
}

export function makePictureRefToken(asset: ImageAsset) {
  return `Plasmic_Image_${asset.uuid}__Ref`;
}

function getOptimizedImageUrl(src: string) {
  const host = DEVFLAGS.imgOptimizerHost.replace(/\/+$/, "");
  if (!host) {
    return undefined;
  }
  let key = src;
  if (/^https?:\/\//i.test(src)) {
    try {
      const url = new URL(src);
      if (
        url.hostname !== "site-assets.plasmic.app" &&
        url.hostname !== "img.plasmic.app" &&
        !url.href.startsWith(DEVFLAGS.siteAssetsBaseUrl.replace(/\/?$/, "/")) &&
        url.origin !== new URL(host).origin
      ) {
        return undefined;
      }
      key = url.pathname.split("/").pop() ?? "";
    } catch {
      return undefined;
    }
  }
  return /^[a-f0-9]{32}\.[a-z0-9]{1,16}$/i.test(key) && !/\.svg$/i.test(key)
    ? `${host}/i/${key}`
    : undefined;
}

export function getCmsImageUrl(uploaded: ImageUploadResponse) {
  const url = getOptimizedImageUrl(uploaded.dataUri);
  if (!url || uploaded.mimeType?.includes("svg")) {
    return uploaded.dataUri;
  }
  const width = uploaded.width > 3840 ? "w=3840&" : "";
  return `${url}?${width}q=75&f=webp`;
}

export function maybeMakePlasmicImgSrc(asset: ImageAsset) {
  if (!asset.dataUri) {
    return undefined;
  }

  // Return just the URL, so PlasmicImg renders a plain <img>, if...
  if (
    // Not a Picture
    asset.type !== ImageAssetType.Picture ||
    // No known full width/height
    !asset.width ||
    !asset.height
  ) {
    return asset.dataUri;
  }

  return {
    src: getOptimizedImageUrl(asset.dataUri) ?? asset.dataUri,
    fullWidth: asset.width,
    fullHeight: asset.height,
    aspectRatio: maybe(
      asset.aspectRatio,
      (aspectRatio) => aspectRatio / ASPECT_RATIO_SCALE_FACTOR,
    ),
  };
}

/**
 * Returns the `loader` prop for PlasmicImg:
 * - `"plasmic"` to use the built-in loader for img.plasmic.app
 * - any other string is the base URL of a custom image optimizer host
 * - `undefined` to omit the prop, so images are served as-is
 */
export function getPlasmicImgLoader(
  imageOpts: ImageExportOpts,
): "plasmic" | string | undefined {
  if (imageOpts.scheme !== "cdn" || !DEVFLAGS.imgOptimizerHost) {
    return undefined;
  }

  // The "plasmic" loader sends requests to img.plasmic.app. Other hosts are
  // passed as the loader's base URL, which needs a newer
  // @plasmicapp/react-web, so keep "plasmic" for img.plasmic.app.
  return DEVFLAGS.imgOptimizerHost === "https://img.plasmic.app"
    ? "plasmic"
    : DEVFLAGS.imgOptimizerHost;
}

export function getSerializedImgSrcForAsset(
  asset: ImageAsset,
  ctx: SerializerBaseContext,
  asStringUrl = false,
) {
  let srcStr: string | undefined = undefined;

  if (asset.dataUri && ctx.exportOpts.imageOpts.scheme === "files") {
    srcStr = `${makeImportedPictureRef(asset)}`;
  } else if (
    asset.dataUri &&
    ctx.exportOpts.imageOpts.scheme === "public-files"
  ) {
    srcStr = `${jsLiteral(makePictureRefToken(asset))}`;
  }

  if (asStringUrl) {
    return srcStr ?? jsLiteral(asset.dataUri ?? "");
  }

  const maybeSrcObject = maybeMakePlasmicImgSrc(asset);
  if (srcStr) {
    if (typeof maybeSrcObject === "object" && maybeSrcObject) {
      // We need to replace `maybeSrcObject.src` by `srcStr`. However, we
      // can't call jsLiteral on it, since `srcStr` is either a js variable name
      // or a string already in the js literal format. So we will manually
      // JSON-stringify this object:
      return `{ ${Object.entries(maybeSrcObject)
        .map(
          ([key, value]) =>
            `${jsLiteral(key)}:${key === "src" ? srcStr : jsLiteral(value)}`,
        )
        .join(", ")} }`;
    }
    return srcStr;
  }
  return jsLiteral(maybeSrcObject ?? "");
}
