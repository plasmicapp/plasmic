import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { jsLiteral, toVarName } from "@/wab/shared/codegen/util";
import { ensure, maybe } from "@/wab/shared/common";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { ASPECT_RATIO_SCALE_FACTOR } from "@/wab/shared/core/tpls";
import { DEVFLAGS, DevFlagsType } from "@/wab/shared/devflags";
import { ImageAsset, TplTag } from "@/wab/shared/model/classes";
import { last } from "lodash";

export function shouldUsePlasmicImg(node: TplTag, projectFlags: DevFlagsType) {
  return node.tag === "img" && projectFlags.usePlasmicImg;
}

export function makeImportedPictureRef(asset: ImageAsset) {
  return `${toVarName(`${asset.name}-${asset.uuid}`)}`;
}

export function makePictureRefToken(asset: ImageAsset) {
  return `Plasmic_Image_${asset.uuid}__Ref`;
}

export function maybeMakePlasmicImgSrc(asset: ImageAsset, exprCtx: ExprCtx) {
  if (!asset.dataUri) {
    return undefined;
  }

  // Don't use PlasmicImg if...
  if (
    // Not a Picture
    asset.type !== ImageAssetType.Picture ||
    // Not enabled for project
    !exprCtx.projectFlags.usePlasmicImg ||
    // No imgOptimizerHost set
    !DEVFLAGS.imgOptimizerHost ||
    // No known full width/height
    !asset.width ||
    !asset.height
  ) {
    return asset.dataUri;
  }

  const imgId =
    asset.dataUri.startsWith("http") &&
    ensure(
      last(asset.dataUri.split("/")),
      "A URL starting with 'http' should contain slashes"
    );

  return {
    src:
      !imgId || imgId.endsWith(".svg")
        ? asset.dataUri
        : `${DEVFLAGS.imgOptimizerHost}/img-optimizer/v1/img/${imgId}`,
    fullWidth: asset.width,
    fullHeight: asset.height,
    aspectRatio: maybe(
      asset.aspectRatio,
      (aspectRatio) => aspectRatio / ASPECT_RATIO_SCALE_FACTOR
    ),
  };
}

export function getSerializedImgSrcForAsset(
  asset: ImageAsset,
  ctx: SerializerBaseContext,
  asStringUrl = false
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

  const maybeSrcObject = maybeMakePlasmicImgSrc(asset, ctx.exprCtx);
  if (srcStr) {
    if (typeof maybeSrcObject === "object" && maybeSrcObject) {
      // We need to replace `maybeSrcObject.src` by `srcStr`. However, we
      // can't call jsLiteral on it, since `srcStr` is either a js variable name
      // or a string already in the js literal format. So we will manually
      // JSON-stringify this object:
      return `{ ${Object.entries(maybeSrcObject)
        .map(
          ([key, value]) =>
            `${jsLiteral(key)}:${key === "src" ? srcStr : jsLiteral(value)}`
        )
        .join(", ")} }`;
    }
    return srcStr;
  }
  return jsLiteral(maybeSrcObject ?? "");
}
