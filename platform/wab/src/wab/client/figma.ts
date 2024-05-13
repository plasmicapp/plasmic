import {
  BackgroundLayer,
  ColorFill,
  Dim,
  ImageBackground,
  LinearGradient,
  mkBackgroundLayer as mkBackgroundLayerWithDefaults,
  NoneBackground,
  RadialGradient,
  Stop,
} from "@/wab/bg-styles";
import {
  Component,
  ensureKnownTplTag,
  ImageAsset,
  RawText,
  Site,
  TplComponent,
  TplNode,
  TplTag,
  VariantsRef,
} from "@/wab/classes";
import { AppCtx } from "@/wab/client/app-ctx";
import { PLASMIC_CLIPBOARD_FORMAT } from "@/wab/client/clipboard";
import {
  SiteOps,
  uploadSvgImage,
} from "@/wab/client/components/canvas/site-ops";
import {
  ImageAssetOpts,
  maybeUploadImage,
  parseImage,
  ResizableImage,
} from "@/wab/client/dom-utils";
import { unzip } from "@/wab/collections";
import {
  arrayEqIgnoreOrder,
  assert,
  crunch,
  ensure,
  rad2deg,
  swallow,
  tuple,
  uniqueName,
  withoutNils,
  withoutNilTuples,
} from "@/wab/common";
import { arrayReversed } from "@/wab/commons/collections";
import { Matrix as AltMatrix } from "@/wab/commons/transformation-matrix";
import {
  getComponentDisplayName,
  isContextCodeComponent,
  isReusableComponent,
} from "@/wab/components";
import { codeLit } from "@/wab/exprs";
import {
  ComponentNode,
  ComponentPropertiesEntries,
  DefaultFrameMixin,
  DefaultShapeMixin,
  FrameNode,
  GroupNode,
  InstanceNode,
  LayoutMixin,
  RGB,
  RGBA,
  SceneNode,
  SolidPaint,
  TextNode,
  Transform,
} from "@/wab/figmaTypes";
import { ImageAssetType } from "@/wab/image-asset-type";
import { mkImageAssetRef } from "@/wab/image-assets";
import { toVarName } from "@/wab/shared/codegen/util";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { isStandaloneVariantGroup } from "@/wab/shared/Variants";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import {
  flattenTpls,
  isTplNamable,
  isTplVariantable,
  mkTplComponentX,
  MkTplTagOpts,
  mkTplTagX,
  TplTagType,
} from "@/wab/tpls";
import { getBoundingRect } from "@figma-plugin/helpers";
import { isString, keys, omit } from "lodash";
import { CSSProperties } from "react";
import {
  applyToPoint,
  compose,
  inverse,
  Matrix,
  rotate,
} from "transformation-matrix";

type Serializable =
  | number
  | string
  | boolean
  | null
  | Array<Serializable>
  | JSONObject;

interface JSONObject {
  [key: string]: Serializable;
}

function mkBackgroundLayer(image: BackgroundLayer["image"]) {
  return mkBackgroundLayerWithDefaults(image, {
    repeat: "no-repeat",
  });
}

/**
 * Our raw FigmaData has no absoluteTransform, only relativeTransform, but this
 * is sufficient for computing a bounding box.
 */
function _getBoundingRect(nodes: SceneNode[]) {
  return getBoundingRect(
    nodes.map((node) => ({
      ...node,
      absoluteTransform: node.relativeTransform,
    }))
  );
}

export function figmaClipIdFromStr(clipboardText: string): string | undefined {
  const maybeFigmaKey = swallow(() => JSON.parse(clipboardText));
  if (!maybeFigmaKey) {
    return undefined;
  }
  if (maybeFigmaKey.__clipType !== PLASMIC_CLIPBOARD_FORMAT) {
    return undefined;
  }
  return maybeFigmaKey.clipId;
}

export const figmaDataFromStr = (
  figmaDataStr: string
): FigmaData | undefined => {
  try {
    const maybeFigmaData = JSON.parse(figmaDataStr);
    if (isFigmaData(maybeFigmaData)) {
      return maybeFigmaData;
    }
    return;
  } catch (e) {
    return;
  }
};

export const uploadFigmaImages = async (
  figmaData: FigmaData,
  appCtx: AppCtx
) => {
  const uploadedImages: Map<
    string,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  > = new Map();
  for (const hash of [...keys(figmaData.i)]) {
    const imageData = figmaData.i[hash];
    const image = await parseImage(appCtx, imageData);
    const url = `data:${image.type};base64,${imageData}`;
    const img = new ResizableImage(
      url,
      image.width,
      image.height,
      image.aspectRatio
    );
    const { imageResult, opts } = await maybeUploadImage(
      appCtx,
      img,
      ImageAssetType.Picture,
      "(unnamed)"
    );
    uploadedImages.set(hash, {
      imageResult: ensure(
        imageResult,
        "There should be a resulting image after upload"
      ),
      opts: ensure(opts, "There should be a resulting opts after upload"),
    });
  }
  return uploadedImages;
};

const createImageAssets = (
  uploadedImages: Map<
    string,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  >,
  siteOps: SiteOps
) => {
  const imageAssets: Map<string, ImageAsset> = new Map();
  uploadedImages.forEach((imageParams, hash) => {
    const { imageResult, opts } = imageParams;
    const asset = siteOps.createImageAsset(imageResult, opts).asset;
    imageAssets.set(hash, asset);
  });
  return imageAssets;
};

const renameImageAssets = (
  siteOps: SiteOps,
  imagesToRename: Map<string, string>,
  imageAssets: Map<string, ImageAsset>
) => {
  imagesToRename.forEach((name, hash) => {
    const imageAsset = ensure(
      imageAssets.get(hash),
      "Should have image asset created for hash"
    );
    siteOps.renameImageAsset(imageAsset, name);
  });
};

const getLayoutParent = (node: SceneNode) => {
  const parent = ensure(
    node.parent,
    "All nodes from denormalized figma data should have parent"
  );
  return { layoutParent: parent, indexOfSibling: -1 };
};

export const tplNodeFromFigmaData = (
  vtm: VariantTplMgr,
  site: Site,
  siteOps: SiteOps,
  nodes: Array<SceneNode>,
  uploadedImages: Map<
    string,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  >,
  nodeImages: Map<
    SceneNode,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  >,
  imagesToRename: Map<string, string>,
  replaceComponentInstances: boolean
): TplNode | undefined => {
  const imageAssets = createImageAssets(uploadedImages, siteOps);
  const nodeAssets = createNodeAssets(nodeImages, siteOps);
  renameImageAssets(siteOps, imagesToRename, imageAssets);
  const maker = getNodeToTplNode(
    site,
    vtm,
    imageAssets,
    nodeAssets,
    replaceComponentInstances
  );
  const nodeToTpl = new Map(
    withoutNilTuples(nodes.map((node) => tuple(node, maker(node))))
  );
  const wrapped = wrapTplNodes(nodeToTpl, vtm);
  if (wrapped) {
    ensureUniqueNames(wrapped);
  }
  return wrapped;
};

function ensureUniqueNames(node: TplNode) {
  const seenNormalized = new Set<string>();
  for (const descendant of flattenTpls(node)) {
    if (isTplNamable(descendant) && descendant.name) {
      let name = descendant.name;
      if (seenNormalized.has(toVarName(name))) {
        name = uniqueName([...seenNormalized], name, {
          normalize: toVarName,
        });
        descendant.name = name;
      }
      seenNormalized.add(toVarName(name));
    }
  }
}

/**
 * Wrap the given nodes in a fixed-size free container box, sized to be the
 * bounding box of the nodes.
 */
function wrapInBox(
  vtm: VariantTplMgr,
  nodeTplPairs: [SceneNode, TplNode][],
  boxOpts: MkTplTagOpts = {}
) {
  const rsh = (tpl: TplNode) => RSH(vtm.ensureBaseVariantSetting(tpl).rs, tpl);

  const [nodes, tpls] = unzip(nodeTplPairs);
  const bbox = _getBoundingRect(nodes);

  for (const [node, tpl] of nodeTplPairs) {
    if (!isTplVariantable(tpl)) {
      continue;
    }

    rsh(tpl).merge({
      position: "absolute",
      left: `${Math.round(node.x - bbox.x)}px`,
      top: `${Math.round(node.y - bbox.y)}px`,
    });
  }

  const wrapper = vtm.mkTplTagX("div", boxOpts, arrayReversed(tpls));
  rsh(wrapper).merge({
    display: "block",
    position: "relative",
    width: `${Math.round(bbox.width)}px`,
    height: `${Math.round(bbox.height)}px`,
  });

  return wrapper;
}

/**
 * If there are multiple Figma nodes, we wrap it in a free container, and fix
 * each child's offset to be relative to the wrapper
 */
function wrapTplNodes(nodeToTpl: Map<SceneNode, TplNode>, vtm: VariantTplMgr) {
  return nodeToTpl.size === 0
    ? undefined
    : nodeToTpl.size === 1
    ? Array.from(nodeToTpl.values())[0]
    : wrapInBox(vtm, [...nodeToTpl.entries()], { name: "Figma Paste" });
}

////////////////////////////////////////////////////////////////////////////////
// Style factories

const styleForLayoutMixinAndConstraintMixin = (
  node: SceneNode
): CSSProperties => {
  const style = flattenStyles(styleForLayoutMixin(node));
  const parent = node.parent;
  if (parent && isDefaultFrameMixin(parent) && parent.layoutMode !== "NONE") {
    assert(
      style.position === "relative",
      "If the parent is AutoLayout, position must be relative"
    );
    // We ignore the layout constraints for now for AutoLayout children
    // TODO: maybe keep some constraints?
    return style;
  }
  if (
    parent &&
    parent.type !== "DOCUMENT" &&
    parent.type !== "PAGE" &&
    "constraints" in node
  ) {
    const width = node.width;
    const layoutParent = getLayoutParent(node).layoutParent as SceneNode;
    const parentWidth = layoutParent.width;
    // Note: style.left is not defined for relative positioning.
    const left = parseInt(String(style.left), 10);
    const right = parentWidth - (left + width);
    switch (node.constraints.horizontal) {
      case "MIN": {
        // Min means left-constrained, which by default we already are
        break;
      }
      case "CENTER": {
        // CENTER means centered within parent container without
        // changing the node size if the parent size changes. Until
        // we support `transform: translateX(-50%)`, we will just
        // ignore this for now.  The child will look centered until
        // you try to resize the parent container.
        break;
      }
      case "MAX": {
        // MAX means right-constrained, so switch to setting `right`
        // instead of `left`
        style.right = `${Math.round(right)}px`;
        delete style.left;
        break;
      }
      case "SCALE": {
        // SCALE scales the left offset and width proportionally to
        // parent container.
        style.left =
          parentWidth === 0
            ? `0%`
            : `${truncateNumber((left / parentWidth) * 100)}%`;
        style.width =
          parentWidth === 0
            ? `0%`
            : `${truncateNumber((width / parentWidth) * 100)}%`;
        break;
      }
      case "STRETCH": {
        style.right = `${Math.round(right)}px`;
        delete style.width;
        break;
      }
    }
    const height = Math.ceil(node.height);
    const parentHeight = layoutParent.height;
    const top = parseInt(String(style.top), 10);
    const bottom = parentHeight - (top + height);
    switch (node.constraints.vertical) {
      case "MIN": {
        break;
      }
      case "CENTER": {
        break;
      }
      case "MAX": {
        style.bottom = `${Math.round(bottom)}px`;
        delete style.top;
        break;
      }
      case "SCALE": {
        style.top =
          parentHeight === 0
            ? "0%"
            : `${truncateNumber((top / parentHeight) * 100)}%`;
        style.height =
          parentHeight === 0
            ? "0%"
            : `${truncateNumber((height / parentHeight) * 100)}%`;
        break;
      }
      case "STRETCH": {
        style.bottom = `${Math.round(bottom)}px`;
        delete style.height;
        break;
      }
    }
  }
  return style;
};

interface Decomposition {
  translate: { x: number; y: number };
  /** Radians */
  rotation: number;
  scale: { x: number; y: number };
  /** Radians */
  skew: { x: number; y: number };
}

function decompose({ a, b, c, d, e, f }: Matrix): Decomposition {
  return AltMatrix.from(a, b, c, d, e, f).decompose();
}

function decomposedCss(dec: Decomposition) {
  return serializeTransform({
    scaleX: dec.scale.x,
    scaleY: dec.scale.y,
    rotation: rad2deg(dec.rotation),
    translateX: dec.translate.x,
    translateY: dec.translate.y,
    skewX: rad2deg(dec.skew.x),
    skewY: rad2deg(dec.skew.y),
  });
}

function omitTranslate({ a, b, c, d }: Matrix): Matrix {
  return { a, b, c, d, e: 0, f: 0 };
}

/**
 * This computes the position and transforms.
 *
 * Figma generally tries to avoid introducing arbitrary transform matrixes into
 * its documents. However, you can introduce them by rotating and then (via a
 * group or via multi-select) scaling some elements. Plugins can also directly
 * apply skew. So we must handle arbitrary transform matrices.
 *
 * We pretty-print these matrices back into decomposed transform operations
 * (rotate, scale, skew).
 *
 * Generally, translate is zero, or else is just a half-pixel correction. This
 * gets instead placed in top/left.
 */
const styleForLayoutMixin = (node: SceneNode & LayoutMixin): CSSProperties => {
  // The DOM will round up widths and heights
  const style: Style = {
    width: `${Math.ceil(node.width)}px`,
    height: `${Math.ceil(node.height)}px`,
    display: "block",
  };

  const matrix = transformToMatrix(node.relativeTransform);

  const transform = decomposedCss(decompose(omitTranslate(matrix)));
  if (transform) {
    // Transforms from Figma assume top/left origin.
    style.transformOrigin = "top left";
    style.transform = transform;
  }

  // If the node has a parent, position it relative to that parent otherwise we
  // let Plasmic position the layer on paste
  if (node.parent) {
    if (isDefaultFrameMixin(node.parent) && node.parent.layoutMode !== "NONE") {
      style.position = "relative";
      if (node.layoutAlign === "STRETCH") {
        // If parent is horizontal, and node.layoutAlign === STRETCH, then we want
        // its height to stretch. So we set alignSelf to stretch, and unset the
        // pixel height set above
        style.alignSelf = "stretch";
        style[node.parent.layoutMode === "HORIZONTAL" ? "height" : "width"] =
          undefined;
      }
      if (node.layoutGrow === 1) {
        // Similarly, if parent is horizontal, and node.layoutGrow is 1, then we
        // want its width to grow. So we set flexGrow to 1, and unset the pixel
        // width set above
        style.flexGrow = 1;
        style[node.parent.layoutMode === "HORIZONTAL" ? "width" : "height"] =
          undefined;
      }
      if (node.layoutSizingHorizontal === "HUG") {
        // if layoutSizingHorizontal is HUG, then we want its width to hug. So we
        // unset the pixel width set above
        style.width = undefined;
      }
      if (node.layoutSizingVertical === "HUG") {
        // if layoutSizingVertical is HUG, then we want its height to hug. So we
        // unset the pixel width set above
        style.height = undefined;
      }
      return style;
    }

    style.position = "absolute";

    let top = node.y;
    let left = node.x;
    let adjustedMatrix = matrix;

    // From the docs at
    // https://www.figma.com/plugin-docs/api/properties/nodes-relativetransform/:
    //
    // "The relative transform of a node is shown relative to its container parent,
    // which includes canvas nodes, frame nodes, component nodes, and instance
    // nodes. Just like in the properties panel, it is not relative to its direct
    // parent if the parent is a group or a boolean operation."
    //
    // So we have to handle groups specially (which can have transforms applied on
    // them).
    //
    // Transforms within a group are relative to the nearest parent frame or page
    // so we need to adjust them to be relative to the group instead.
    if (node.parent.type === "GROUP") {
      const adjustedTopLeft = applyToPoint(
        inverse(transformToMatrix(node.parent.relativeTransform)),
        {
          x: left,
          y: top,
        }
      );
      top = adjustedTopLeft.y;
      left = adjustedTopLeft.x;

      // Factor out any transform from the parent group to calculate relative
      // transform
      adjustedMatrix = compose(
        inverse(transformToMatrix(node.parent.relativeTransform)),
        matrix
      );
    }

    // The DOM rounds positions already
    style.top = `${Math.round(top)}px`;
    style.left = `${Math.round(left)}px`;
    style.transform = decomposedCss({
      ...decompose(omitTranslate(adjustedMatrix)),
      // Adjust position to account for half pixel translations
      translate: {
        x: left - Math.round(left),
        y: top - Math.round(top),
      },
    });
  }
  return style;
};

const styleForBlendMixin = (node: SceneNode): Array<Style> => {
  if (!("blendMode" in node)) {
    return [];
  }
  return [
    // `PASS_THROUGH` only effects masks which are unsupported
    node.blendMode !== "PASS_THROUGH" && {
      mixBlendMode: node.blendMode
        .split("_")
        .map((s) => s.toLocaleLowerCase())
        .join("-") as CSSProperties["mixBlendMode"],
    },
    node.isMask && {
      overflow: "hidden",
    },
    // Plasmic wants a string but the type is defined as a number
    node.opacity !== 1 && { opacity: String(node.opacity) },
    ...(node.effects || []).map((effect): Style => {
      if (!effect.visible) {
        return;
      }
      switch (effect.type) {
        case "BACKGROUND_BLUR":
          return { backdropFilter: `blur(${effect.radius}px)` };
        case "DROP_SHADOW": {
          if (shouldUseBoxShadow(node)) {
            return {
              boxShadow: `${effect.offset.x}px ${effect.offset.y}px ${
                effect.radius
              }px 0px ${rgbaToString(effect.color)}`,
            };
          } else if (node.type === "TEXT") {
            return {
              textShadow: `${effect.offset.x}px ${effect.offset.y}px ${
                effect.radius
              }px ${rgbaToString(effect.color)}`,
            };
          } else {
            // `drop-shadow` is twice as blurry as `box-shadow`
            return {
              filter: `drop-shadow(${effect.offset.x}px ${effect.offset.y}px ${
                effect.radius / 2
              }px ${rgbaToString(effect.color)})`,
            };
          }
        }
        case "INNER_SHADOW": {
          if (boxShadowNodeTypes.includes(node.type)) {
            return {
              boxShadow: `inset ${effect.offset.x}px ${effect.offset.y}px ${
                effect.radius
              }px 0px ${rgbaToString(effect.color)}`,
            };
          } else {
            // Not easily supported on other types of DOM nodes, so leaving this
            // out for now
            return;
          }
        }
        case "LAYER_BLUR":
          return { filter: `blur(${effect.radius})` };
      }
    }),
  ];
};

function shouldUseBoxShadow(node: SceneNode) {
  if (!boxShadowNodeTypes.includes(node.type)) {
    return false;
  }
  if (!hasChildren(node) || !node.children) {
    return true;
  }

  return node.children.every(shouldUseBoxShadow);
}

function hasChildren(
  node: SceneNode
): node is FrameNode | GroupNode | ComponentNode | InstanceNode {
  return (
    node.type === "FRAME" ||
    node.type === "GROUP" ||
    node.type === "COMPONENT" ||
    node.type === "INSTANCE"
  );
}

const styleForGeometryMixin = (
  node: SceneNode,
  imageAssets: Map<string, ImageAsset>
): Style => {
  // Don't run these for vectors! The result is already in the SVG.
  if (vectorNodeTypes.includes(node.type)) {
    return [];
  }

  if (!("fills" in node)) {
    return [];
  }

  return [
    ...(node.fills || [])
      .map((paint): Style => {
        if (!paint.visible) {
          return;
        }
        switch (paint.type) {
          case "GRADIENT_LINEAR": {
            // Figma stores gradient start and endpoints as an affine transform
            // applied to these original points
            const matrix = inverse(transformToMatrix(paint.gradientTransform));

            // If the matrix is not invertible, we won't attempt to use it
            if (isNaN(matrix.a)) {
              return;
            }

            const startPoint = applyToPoint(matrix, { x: 0, y: 0.5 });
            const endPoint = applyToPoint(matrix, { x: 1, y: 0.5 });

            // Scale the points from (0, 1) unit square to the size of the node
            startPoint.x *= node.width;
            startPoint.y *= node.height;
            endPoint.x *= node.width;
            endPoint.y *= node.height;

            // Calculate the angle relative to the y-axis
            let angle = Math.atan2(
              endPoint.x - startPoint.x,
              endPoint.y - startPoint.y
            );
            if (endPoint.y > startPoint.y) {
              angle = Math.PI - angle;
            }

            // Calculate the distance between the points, as well as the length of the
            // final CSS linear-gradient and use that to determine a scale factor
            // https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient
            const length = Math.sqrt(
              Math.pow(endPoint.x - startPoint.x, 2) +
                Math.pow(endPoint.y - startPoint.y, 2)
            );
            const targetLength =
              Math.abs(node.width * Math.sin(angle)) +
              Math.abs(node.height * Math.cos(angle));
            const scale = length / targetLength;

            // Calculate the offset (as a percentage of the total length of the CSS
            // linear-gradient) of the start point in Figma to the linear-gradient
            // start point
            const { y: start } = applyToPoint(
              rotate(-angle, node.width / 2, node.height / 2),
              startPoint
            );
            const targetStart = node.height / 2 + targetLength / 2;
            const offset = Math.abs(start - targetStart) / targetLength;

            // Convert to degrees so it is easier to work with in code
            const angleDEG = truncateNumber(rad2deg(angle));
            const stops = (paint.gradientStops || []).map(
              ({ color, position }) =>
                new Stop(
                  rgbaToString(color),
                  new Dim(
                    truncateNumber((position * scale + offset) * 100),
                    "%"
                  )
                )
            );
            return {
              background: mkBackgroundLayer(
                new LinearGradient({
                  repeating: false,
                  angle: angleDEG,
                  stops,
                })
              ).showCss(),
            };
          }
          case "GRADIENT_RADIAL":
            // TODO: Calculate a more accurate radial gradient from transform
            return {
              background: mkBackgroundLayer(
                new RadialGradient({
                  repeating: false,
                  stops: (paint.gradientStops || []).map(
                    ({ color, position }) =>
                      new Stop(
                        rgbaToString(color),
                        new Dim(truncateNumber(position * 100), "%")
                      )
                  ),
                  cx: new Dim(50, "%"),
                  cy: new Dim(50, "%"),
                  rx: new Dim(50, "%"),
                  ry: new Dim(50, "%"),
                })
              ).showCss(),
            };
          case "IMAGE": {
            // ImageHash can be null (https://www.figma.com/plugin-docs/api/Paint/#imagehash)
            const asset = paint.imageHash
              ? ensure(
                  imageAssets.get(paint.imageHash),
                  "[Figma] - Paint not found in imageAssets"
                )
              : undefined;
            const layer = mkBackgroundLayer(
              asset
                ? new ImageBackground({
                    url: mkImageAssetRef(asset),
                  })
                : new NoneBackground()
            );
            switch (paint.scaleMode) {
              case "FILL":
                layer.position = "center center";
                layer.size = "cover";
                break;
              case "FIT":
                layer.position = "center center";
                layer.size = "contain";
                break;
              case "CROP":
                {
                  const transform = transformToMatrix(
                    ensure(
                      paint.imageTransform,
                      "[Figma] - Asset without imageTransform"
                    )
                  );
                  // The position of the top-left corner in the image (in [0,1])
                  const p0 = applyToPoint(transform, { x: 0, y: 0 });
                  // The position of the bottom-right corner in the image (in [0,1])
                  const p1 = applyToPoint(transform, { x: 1, y: 1 });
                  // Note this is not the native size of the image, but scaled
                  // image - you can scale image while croping it in Figma.
                  const imageWidth = node.width / (p1.x - p0.x);
                  const imageHeight = node.height / (p1.y - p0.y);
                  layer.position = `${Math.round(
                    -p0.x * imageWidth
                  )}px ${Math.round(-p0.y * imageHeight)}px`;
                  layer.size = `${Math.round(imageWidth)}px ${Math.round(
                    imageHeight
                  )}px`;
                }
                break;
              case "TILE":
                {
                  const scale = ensure(
                    paint.scalingFactor,
                    "[Figma] - Asset without scaling factor"
                  );
                  const w = ensure(
                    asset?.width,
                    "[Figma] - Asset without width"
                  );
                  const h = ensure(
                    asset?.height,
                    "[Figma] - Asset without height"
                  );
                  layer.position = "0% 0%";
                  layer.size = `${Math.round(w * scale)}px ${Math.round(
                    h * scale
                  )}px`;
                  layer.repeat = "repeat";
                }
                break;
            }
            return {
              background: layer.showCss(),
            };
          }
          case "SOLID":
            return {
              background: mkBackgroundLayer(
                new ColorFill({
                  color: rgbToString(paint.color, paint.opacity),
                })
              ).showCss(),
            };
          default:
            return;
        }
      })
      .reverse(), // Figma background layers are exported in reverse order
    ...(node.strokes || []).map((paint): Style => {
      if (!paint.visible) {
        return;
      }
      if (paint.type === "SOLID" && node.strokeWeight) {
        const boxShadow = `0px 0px 0px ${
          node.strokeAlign === "CENTER"
            ? node.strokeWeight / 2
            : node.strokeWeight
        }px ${rgbToString(paint.color, paint.opacity)}`;
        const insetBoxShadow = `inset ${boxShadow}`;
        if (node.strokeAlign === "CENTER") {
          return { boxShadow: [boxShadow, insetBoxShadow].join(", ") };
        } else if (node.strokeAlign === "INSIDE") {
          return { boxShadow: insetBoxShadow };
        } else {
          return { boxShadow };
        }
      } else {
        return;
      }
    }),
  ];
};

const styleForCornerMixin = (node: SceneNode): Style => {
  if ("cornerRadius" in node) {
    return node.cornerRadius === undefined || node.cornerRadius === 0
      ? {}
      : {
          borderTopLeftRadius: `${node.cornerRadius}px`,
          borderTopRightRadius: `${node.cornerRadius}px`,
          borderBottomLeftRadius: `${node.cornerRadius}px`,
          borderBottomRightRadius: `${node.cornerRadius}px`,
        };
  }
  return {};
};

const styleForRectangleCornerMixin = (node: SceneNode): Style => {
  if (!("topLeftRadius" in node)) {
    return {};
  }
  const style: Style = {};
  node.topLeftRadius && (style.borderTopLeftRadius = `${node.topLeftRadius}px`);
  node.topRightRadius &&
    (style.borderTopRightRadius = `${node.topRightRadius}px`);
  node.bottomLeftRadius &&
    (style.borderBottomLeftRadius = `${node.bottomLeftRadius}px`);
  node.bottomRightRadius &&
    (style.borderBottomRightRadius = `${node.bottomRightRadius}px`);
  return style;
};

const styleForDefaultShapeMixin = (
  node: SceneNode & DefaultShapeMixin,
  imageAssets: Map<string, ImageAsset>
): Style =>
  flattenStyles(
    styleForBlendMixin(node),
    styleForGeometryMixin(node, imageAssets)
    // Leave out layout mixin and let subclasses define if they use only layout
    // or layout and constraints, these mixins effect the same CSS properties
    // and need to be computed together
  );

const styleForDefaultFrameMixin = (
  node: SceneNode,
  imageAssets: Map<string, ImageAsset>
) => {
  const style = flattenStyles(
    styleForGeometryMixin(node, imageAssets),
    styleForCornerMixin(node),
    styleForRectangleCornerMixin(node),
    styleForBlendMixin(node),
    styleForLayoutMixinAndConstraintMixin(node),
    "clipsContent" in node && node.clipsContent && { overflow: "hidden" }
  );

  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    style.display = "flex";
    style.flexDirection = { HORIZONTAL: "row", VERTICAL: "column" }[
      node.layoutMode
    ] as CSSProperties["flexDirection"];

    if (node.layoutMode === "HORIZONTAL") {
      if (node.primaryAxisSizingMode === "AUTO") {
        style.width = "wrap";
      }
      if (node.counterAxisSizingMode === "AUTO") {
        style.height = "wrap";
      }
      if (node.itemSpacing > 0) {
        style["flex-column-gap"] = `${node.itemSpacing}px`;
      }
    } else if (node.layoutMode === "VERTICAL") {
      if (node.primaryAxisSizingMode === "AUTO") {
        style.height = "wrap";
      }
      if (node.counterAxisSizingMode === "AUTO") {
        style.width = "wrap";
      }
      if (node.itemSpacing > 0) {
        style["flex-row-gap"] = `${node.itemSpacing}px`;
      }
    }

    style["align-items"] = {
      MIN: "flex-start",
      CENTER: "center",
      MAX: "flex-end",
    }[node.counterAxisAlignItems] as CSSProperties["alignItems"];

    style["justify-content"] = {
      MIN: "flex-start",
      CENTER: "center",
      MAX: "flex-end",
      SPACE_BETWEEN: "space-between",
    }[node.primaryAxisAlignItems] as CSSProperties["justifyContent"];

    if (node.paddingLeft !== 0) {
      style.paddingLeft = `${node.paddingLeft}px`;
    }
    if (node.paddingRight !== 0) {
      style.paddingRight = `${node.paddingRight}px`;
    }
    if (node.paddingTop !== 0) {
      style.paddingTop = `${node.paddingTop}px`;
    }
    if (node.paddingBottom !== 0) {
      style.paddingBottom = `${node.paddingBottom}px`;
    }
  } else {
    style.display = "block";
  }

  return style;
};

const styleForTextNode = (node: TextNode): Style => {
  const style: Style = {
    fontSize: `${node.fontSize}px`,
    textAlign: (
      {
        CENTER: "center",
        LEFT: undefined, // "left" is the default
        RIGHT: "right",
        JUSTIFIED: "justify",
      } as const
    )[node.textAlignHorizontal],
    textTransform: (
      {
        ORIGINAL: undefined, // "none" is the default
        UPPER: "uppercase",
        LOWER: "lowercase",
        TITLE: "capitalize",
      } as const
    )[node.textCase || "ORIGINAL"],
    textDecorationLine: (
      {
        NONE: undefined, // "none" is the default
        UNDERLINE: "underline",
        STRIKETHROUGH: "line-through",
      } as const
    )[node.textDecoration || "NONE"],
  };

  if (node.fontName) {
    style.fontFamily = node.fontName.family;
    const normalizedFontStyle = node.fontName.style
      .split(" ")
      .join("")
      .toLocaleLowerCase();
    // https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight
    if (
      normalizedFontStyle.includes("thin") ||
      normalizedFontStyle.includes("hairline")
    ) {
      style.fontWeight = 100;
    } else if (
      normalizedFontStyle.includes("extralight") ||
      normalizedFontStyle.includes("ultralight")
    ) {
      style.fontWeight = 200;
    } else if (normalizedFontStyle.includes("light")) {
      style.fontWeight = 300;
    } else if (
      normalizedFontStyle.includes("normal") ||
      normalizedFontStyle.includes("regular")
    ) {
      style.fontWeight = 400;
    } else if (normalizedFontStyle.includes("medium")) {
      style.fontWeight = 500;
    } else if (
      normalizedFontStyle.includes("semibold") ||
      normalizedFontStyle.includes("demibold")
    ) {
      style.fontWeight = 600;
    } else if (
      normalizedFontStyle.includes("bold") &&
      !(
        normalizedFontStyle.includes("extrabold") ||
        normalizedFontStyle.includes("ultrabold")
      )
    ) {
      style.fontWeight = 700;
    } else if (
      normalizedFontStyle.includes("extrabold") ||
      normalizedFontStyle.includes("ultrabold")
    ) {
      style.fontWeight = 800;
    } else if (
      (normalizedFontStyle.includes("black") &&
        !(
          normalizedFontStyle.includes("extrablack") ||
          normalizedFontStyle.includes("ultrablack")
        )) ||
      normalizedFontStyle.includes("heavy")
    ) {
      style.fontWeight = 900;
    } else if (
      normalizedFontStyle.includes("extrablack") ||
      normalizedFontStyle.includes("ultrablack")
    ) {
      style.fontWeight = 950;
    }
  }

  if (node.letterSpacing) {
    if (node.letterSpacing.unit === "PERCENT") {
      style.letterSpacing = `${node.letterSpacing.value / 100}em`;
    } else {
      style.letterSpacing = `${node.letterSpacing.value}px`;
    }
  }

  if (node.lineHeight) {
    switch (node.lineHeight.unit) {
      case "PERCENT":
        // Figma may incorrectly report a percent line-height of 0. This seems
        // to happen when we are trying to import while missing the font. Using
        // a line height of 0 is rare and not recommended. Here we're setting
        // the value back to 100%.
        style.lineHeight =
          (node.lineHeight.value === 0 ? 100 : node.lineHeight.value) / 100;
        break;
      case "PIXELS":
        style.lineHeight = `${node.lineHeight.value}px`;
        break;
      case "AUTO":
        style.lineHeight = "100%";
        break;
    }
  }

  if (node.textAutoResize === "HEIGHT") {
    style["height"] = undefined;
  } else if (node.textAutoResize === "WIDTH_AND_HEIGHT") {
    style["width"] = undefined;
    style["height"] = undefined;
  }

  const hasOnlySolidFills = (node.fills || [])
    .map((paint) => paint.type === "SOLID")
    .reduce((a, b) => a && b, true);
  if (hasOnlySolidFills) {
    const fills = (node.fills || []) as Array<SolidPaint>;
    if (fills.length > 0) {
      const paint = fills[0];
      style.color = rgbToString(paint.color, paint.opacity);
    }
  } else {
    const layer = mkBackgroundLayer(
      new ColorFill({ color: rgbaToString({ r: 0, g: 0, b: 0, a: 0 }) })
    );
    layer.clip = "text";
    style.background = layer.showCss();
    style.color = "transparent";
  }

  return style;
};

////////////////////////////////////////////////////////////////////////////////
// Helpers

export type FigmaData = {
  version?: string;
  // Images (as base 64 data)
  i: Map<string, string>;
  // Keys
  k: Array<string>;
  // Nodes
  n: Array<JSONObject>;
  // Strings
  s: Array<string>;
  // Vectors (as SVG XML)
  v: Map<string, string>;
};

const isFigmaData = (object: any): object is FigmaData => {
  if (typeof object === "object") {
    return arrayEqIgnoreOrder(
      Object.keys(object).filter((k) => k !== "version"),
      ["i", "k", "n", "s", "v"]
    );
  }
  return false;
};

export const denormalizeFigmaData = (
  data: FigmaData
): { nodes: Array<SceneNode>; imagesToRename: Map<string, string> } => {
  const imagesToRename: Map<string, string> = new Map();
  const denormalize = (
    object: any,
    parent: { [key: string]: Serializable } | null = null
  ) => {
    if (Array.isArray(object)) {
      return object.map((obj) => denormalize(obj, parent));
    } else if (typeof object === "object") {
      const denormalized: { [key: string]: Serializable } = { parent };
      Object.entries(object).forEach(
        ([key, value]) =>
          (denormalized[data.k[parseInt(key, 36)]] = denormalize(
            value,
            denormalized
          ))
      );
      if (typeof denormalized.imageHash === "string") {
        // Set the imageAsset's name to the first named using node.
        const par = denormalized["parent"];
        if (
          !imagesToRename.has(denormalized.imageHash) &&
          par &&
          isString(par["name"])
        ) {
          imagesToRename.set(denormalized.imageHash, par["name"]);
        }
      }
      if (typeof denormalized.svgHash === "string") {
        denormalized.svgData = data.v[denormalized.svgHash as string];
      }
      const children = (denormalized.children || []) as any as Array<SceneNode>;
      for (let i = 0; i < children.length; i++) {
        const c = children[i];
        const { layoutParent, indexOfSibling } = getLayoutParent(children[i]);
        if (indexOfSibling !== -1) {
          c.x -= (layoutParent as SceneNode).x;
          c.y -= (layoutParent as SceneNode).y;
        }
      }
      return denormalized;
    } else if (typeof object === "string") {
      return data.s[parseInt(object, 36)];
    } else {
      return object;
    }
  };
  return {
    nodes: (denormalize(data.n) as Array<SceneNode>).reverse(),
    imagesToRename,
  };
};

async function uploadAssetFromNode(node: SceneNode, appCtx: AppCtx) {
  if (!("svgData" in node)) {
    // An invisible node. Just discard it.
    return undefined;
  }

  // For Vector node types, attempt to use the svg dimensions as in figma
  // they're usually managed via strokes.
  const nodeWidth = node.width;
  const nodeHeight = node.height;

  const xml = ensure(node.svgData, "Checked before");

  const { imageResult, opts } = await uploadSvgImage(
    xml,
    vectorNodeTypes.includes(node.type),
    nodeWidth,
    nodeHeight,
    appCtx,
    node.name
  );
  return {
    imageResult: ensure(
      imageResult,
      "There should be a resulting image after upload"
    ),
    opts: ensure(opts, "There should be a resulting opts after upload"),
  };
}

/**
 * Returns whether the transform has any effect, ignoring translations.
 */
function isIdentityTransform({ a, b, c, d }: Matrix) {
  return a === 1 && b === 0 && c === 0 && d === 1;
}

const vectorNodeTypes = [
  "BOOLEAN_OPERATION",
  "VECTOR",
  "ELLIPSE",
  "STAR",
  "LINE",
  "POLYGON",
];

// We consider display invalid for code components since applying `display: block` to
// a code component root maybe doesn't work as expected so we will ignore it.
// Similarly to when a code component is inserted through the UI
const invalidCodeComponentStyles = ["display"] as (keyof CSSProperties)[];

function filterValidCodeComponentStyles(styles: CSSProperties) {
  return omit(styles, invalidCodeComponentStyles);
}

const getNodeToTplNode = (
  site: Site,
  vtm: VariantTplMgr,
  imageAssets: Map<string, ImageAsset>,
  nodeAssets: Map<SceneNode, { asset: ImageAsset; iconColor?: string }>,
  replaceComponentInstances: boolean
) => {
  const setNodeStyle = (
    node: SceneNode,
    tpl: TplTag | TplComponent,
    styles: Array<Style>
  ) => {
    const vs = vtm.ensureBaseVariantSetting(tpl);
    RSH(vs.rs, tpl).merge(flattenStyles(styles));
    if (!node.visible) {
      vs.dataCond = codeLit(false);
    }
  };

  function setMaskForTag(node: SceneNode, tag: TplTag) {
    // If the node has a direct mask children, add it via css masks.
    const firstMaskNode =
      "children" in node
        ? ensure(node.children, "checked before").find(
            (child) => "isMask" in child && child.isMask
          )
        : undefined;
    const asset = firstMaskNode ? nodeAssets.get(firstMaskNode) : undefined;

    if (asset) {
      setNodeStyle(node, tag, [
        {
          "-webkit-mask-image": mkImageAssetRef(asset.asset),
          "-webkit-mask-size": `${asset.asset.width}px ${asset.asset.height}px`,
          "-webkit-mask-repeat": "no-repeat",
        } as any,
      ]);
    }
  }

  const adjustedChildren = (
    children: ReadonlyArray<SceneNode>,
    isAutoLayoutParent = false
  ) => {
    const tplChildren = children.map(nodeToTplNode);

    const newChildren: Array<TplNode> = [];
    for (let i = 0; i < children.length; i++) {
      const tpl = tplChildren[i];
      if (!tpl) {
        continue;
      }
      const node = children[i];
      // Unlike in CSS, transforms in Figma actually affect layout. So whenever
      // we encounter a node that has been transformed (and it's within an
      // auto-layout), we wrap it in a div that is simply a fixed-size free
      // container (basically the bounding box).
      let adjustedTpl = tpl;
      if (
        isAutoLayoutParent &&
        !isIdentityTransform(transformToMatrix(node.relativeTransform))
      ) {
        adjustedTpl = wrapInBox(vtm, [tuple(node, tpl)]);
      }
      const { indexOfSibling } = getLayoutParent(node);
      if (indexOfSibling !== -1) {
        const tplParent = ensureKnownTplTag(tplChildren[indexOfSibling]);
        tplParent.children.push(tpl);
        tpl.parent = tplParent;
      } else {
        newChildren.push(adjustedTpl);
      }
    }

    return newChildren;
  };

  function convertToAsset(node: SceneNode) {
    const asset = nodeAssets.get(node);

    // An invisible node. Just discard it.
    if (!asset) {
      return undefined;
    }

    const tag = vtm.mkTplImage({
      asset: asset.asset,
      type: ImageAssetType.Icon,
      iconColor: asset.iconColor,
    });

    // Fills should be inside the SVG.
    if ("fills" in node) {
      node.fills = [];
    }

    // Instead of using DefaultShapeMixin, just use the mixins which
    // aren't encoded in the SVG itself
    const style =
      node.type === "BOOLEAN_OPERATION"
        ? styleForLayoutMixin(node)
        : styleForDefaultFrameMixin(node, new Map([]));

    // Set the size to the node as the size of the image
    setNodeStyle(node, tag, [
      style,
      { width: `${asset.asset.width}px`, height: `${asset.asset.height}px` },
    ]);
    return tag;
  }

  const allComponents = [
    ...site.components,
    ...site.projectDependencies.flatMap((dep) => dep.site.components),
  ].filter(
    (comp) => isReusableComponent(comp) && !isContextCodeComponent(comp)
  );

  const getSlots = (
    node: SceneNode
  ): [string, TplTag | TplComponent | undefined][] => {
    const slotIdentifier = "slot: ";
    if (node.name.startsWith(slotIdentifier)) {
      const tplNode = nodeToTplNode(node);
      if (tplNode) tplNode.name = undefined;
      return [[node.name.substring(slotIdentifier.length), tplNode]];
    }
    switch (node.type) {
      case "INSTANCE":
      case "FRAME":
      case "COMPONENT":
      case "COMPONENT_SET":
      case "GROUP":
        return node.children
          ? node.children.flatMap((child) => getSlots(child))
          : [];
      default:
        return [];
    }
  };
  const nodeToTplNode = (
    node: SceneNode
  ): TplTag | TplComponent | undefined => {
    if ("isMask" in node && node.isMask) {
      return undefined; // Masks will be handled by the parent.
    }
    if (
      node.type == "INSTANCE" &&
      replaceComponentInstances &&
      node.mainComponent
    ) {
      const component = findMappedComponent(node, allComponents);
      if (component) {
        function getAllProperties(
          inst: InstanceNode
        ): ComponentPropertiesEntries {
          const localProps: ComponentPropertiesEntries = Object.entries(
            inst.componentProperties ?? {}
          );

          const exposedInstances: InstanceNode[] = inst.exposedInstances ?? [];

          const exposedProps = exposedInstances.reduce(
            (acc, _inst): ComponentPropertiesEntries => {
              return [...acc, ...getAllProperties(_inst)];
            },
            [] as ComponentPropertiesEntries
          );

          /*
            When creating the nodes while denormalizing the data, we always create an
            "parent" prop to every Object, which just points to its parent on the
            entire tree, but that applies to every object (since we don't know before
              which objects are nodes), so we also add the parent to the object
              "ComponentProperties"... which is why we filter it here
          */
          return [...localProps, ...exposedProps].filter(
            ([k]) => k !== "parent"
          );
        }

        function getAllDescendants(inst: InstanceNode): InstanceNode[] {
          const children = inst.children ?? [];
          const descendants = children.flatMap((child) =>
            child.type === "INSTANCE"
              ? [child, ...getAllDescendants(child)]
              : []
          );
          return descendants;
        }

        const allNodeProperties = getAllProperties(node);

        const ACCEPTED_TYPES = ["TEXT", "BOOLEAN", "VARIANT", "INSTANCE_SWAP"];

        const allDescendants = getAllDescendants(node);

        function getChildComponentNameFromPropertyKey(key: string | undefined) {
          if (!key) {
            return undefined;
          }
          const refNode = allDescendants.find(
            (child) => child.componentPropertyReferences?.mainComponent === key
          );
          return refNode?.name;
        }

        const propsArgs = withoutNils(
          allNodeProperties.map(([k, prop]) => {
            if (!ACCEPTED_TYPES.includes(prop.type)) {
              return null;
            }
            // Fix property name, removing the suffix that figma adds to text and boolean properties
            const key =
              prop.type === "VARIANT" ? k : k.substring(0, k.lastIndexOf("#"));
            const param = component.params.find(
              (p) => toVarName(p.variable.name) === toVarName(key)
            );

            if (!param) {
              return null;
            }

            // We don't handle slots here, they are handled in the next step
            if (param?.type.name === "renderable") {
              return null;
            }

            const parsedValue =
              prop.type === "INSTANCE_SWAP"
                ? getChildComponentNameFromPropertyKey(k)
                : prop.value;

            const variantGroup = component.variantGroups.find(
              (group) => group.param === param
            );
            const isTrueishValue =
              parsedValue === 1 ||
              ["true", "on"].includes(`${parsedValue}`.trim().toLowerCase());
            if (variantGroup) {
              // Currently only will toggle single-variants if the Property and Value has the same name, the value has the name "on" or if its
              // a boolean prop. For variant groups, works as expected (matches figma property with group name, and value with variant name)
              if (isStandaloneVariantGroup(variantGroup)) {
                return isTrueishValue
                  ? [
                      param.variable.name,
                      new VariantsRef({ variants: [variantGroup.variants[0]] }),
                    ]
                  : null;
              } else {
                const variant = variantGroup.variants.find(
                  (v) => toVarName(v.name) === toVarName(`${parsedValue}`)
                );
                return variant
                  ? [
                      param.variable.name,
                      new VariantsRef({ variants: [variant] }),
                    ]
                  : null;
              }
            }
            // Link props crashes studio if assigned an boolean
            if (param.type.name === "href" && prop.type === "BOOLEAN")
              return null;
            // Parse text to number if param is number
            if (param.type.name === "num" && prop.type === "TEXT") {
              return [param.variable.name, Number(parsedValue)];
            }
            if (param.type.name === "bool") {
              return isTrueishValue ? [param.variable.name, true] : null;
            }
            return [param.variable.name, parsedValue];
          })
        );

        const slotsArgs = node.children
          ? node.children
              .flatMap((child) => getSlots(child))
              .filter(([k, tpl]) => {
                const param = component.params.find(
                  (p) => p.variable.name === k
                );
                return !!param && !!tpl && param.type.name === "renderable";
              })
          : [];
        const args = Object.fromEntries([...propsArgs, ...slotsArgs]);
        const tplComponent = mkTplComponentX({
          component,
          baseVariant: vtm.getBaseVariantForNewNode(),
          args,
          name: node.name,
        });
        setNodeStyle(node, tplComponent, [
          filterValidCodeComponentStyles(
            styleForLayoutMixinAndConstraintMixin(node)
          ),
        ]);
        return tplComponent;
      }
    }
    if ("svgData" in node) {
      return convertToAsset(node);
    }
    switch (node.type) {
      case "BOOLEAN_OPERATION":
      case "LINE":
      case "POLYGON":
      case "STAR":
      case "ELLIPSE":
      case "VECTOR": {
        return convertToAsset(node);
      }
      case "INSTANCE":
      case "FRAME":
      case "COMPONENT":
      case "COMPONENT_SET": {
        const tag = mkTplTagX(
          "div",
          { name: node.name },
          adjustedChildren(node.children || [], node.layoutMode !== "NONE")
        );
        setNodeStyle(node, tag, [styleForDefaultFrameMixin(node, imageAssets)]);
        setMaskForTag(node, tag);
        return tag;
      }
      case "GROUP": {
        const tag = mkTplTagX(
          "div",
          { name: node.name },
          adjustedChildren(node.children || [])
        );
        setNodeStyle(node, tag, [
          styleForBlendMixin(node),
          styleForLayoutMixin(node),
        ]);
        setMaskForTag(node, tag);
        return tag;
      }
      case "RECTANGLE": {
        const tag = mkTplTagX("div", { name: node.name });
        setNodeStyle(node, tag, [
          styleForDefaultShapeMixin(node, imageAssets),
          styleForLayoutMixinAndConstraintMixin(node),
          styleForCornerMixin(node),
          styleForRectangleCornerMixin(node),
        ]);
        return tag;
      }
      case "TEXT": {
        // Text node names are never truncated, only consecutive whitespaces are
        // replaced with a single space (exactly the behavior of crunch()).
        // (Determined experimentally.)

        // Note: although .characters should never be undefined, we've seen it
        // in the wild, such as with
        // https://app.clubhouse.io/plasmic/story/9747/figma-import-text-nodes-might-not-have-name-or-characters.
        // So we err on the safe side and use an empty string. (In that design,
        // I would expect that text node to be empty.)
        const chars = node.characters ?? "";

        const isAutoNamed = crunch(node.name) === crunch(chars);
        const textTag = mkTplTagX("div", {
          name: isAutoNamed ? undefined : node.name,
          type: TplTagType.Text,
        });
        const variantSetting = vtm.ensureBaseVariantSetting(textTag);
        variantSetting.text = new RawText({
          text: chars,
          markers: [],
        });

        const styleForText = styleForTextNode(node);

        const styles = flattenStyles(
          styleForDefaultShapeMixin(node, imageAssets),
          styleForLayoutMixinAndConstraintMixin(node),
          styleForText
        );

        if (!styleForText || styleForText["color"] !== "transparent") {
          delete styles["background"];
        }

        // Separate off the layout related styles in case we need to add a
        // wrapper to this
        const {
          alignSelf,
          position,
          top,
          left,
          bottom,
          right,
          width,
          height,
          transform,
          transformOrigin,
          ...textStyle
        } = styles;

        const layoutStyle = Object.fromEntries(
          Object.entries({
            alignSelf,
            position,
            top,
            left,
            bottom,
            right,
            width,
            height,
            transform,
            transformOrigin,
          }).filter(([_, value]) => typeof value !== "undefined")
        );

        // Only set the text styles for now
        RSH(variantSetting.rs, textTag).merge(textStyle);
        if (!node.visible) {
          variantSetting.dataCond = codeLit(false);
        }

        // If the text isn't a fixed size, or the alignment is set to top we
        // don't need to wrap it, that's how it already behaves
        if (
          node.textAutoResize !== "NONE" ||
          node.textAlignVertical === "TOP"
        ) {
          RSH(variantSetting.rs, textTag).merge(layoutStyle);
          return textTag;
        } else {
          const wrapperTag = mkTplTagX("div", { name: node.name }, [textTag]);
          RSH(vtm.ensureBaseVariantSetting(wrapperTag).rs, wrapperTag).merge({
            ...layoutStyle,
            display: "flex",
            flexDirection: "column",
            justifyContent:
              node.textAlignVertical === "BOTTOM" ? "flex-end" : "center",
          });
          return wrapperTag;
        }
      }
      default:
        return;
    }
  };

  return nodeToTplNode;
};

const transformToMatrix = (transform: Transform): Matrix => {
  const [[a, c, e], [b, d, f]] = transform;
  return { a, b, c, d, e, f };
};

const rgbToString = ({ r, g, b }: RGB, a: number = 1): string =>
  `rgba(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(
    b * 255
  )}, ${a})`;

const rgbaToString = ({ r, g, b, a }: RGBA) => rgbToString({ r, g, b }, a);

const boxShadowNodeTypes = [
  "RECTANGLE",
  "ELLIPSE",
  "FRAME",
  "INSTANCE",
  "COMPONENT",
];

const delimiters = {
  backdropFilter: " ",
  background: ", ",
  boxShadow: ", ",
  filter: " ",
  textShadow: ", ",
  transform: " ",
};

type Style = CSSProperties | StyleArray | false | null | undefined;

type StyleArray = Array<Style>;

const flattenStyles = (...styles: Array<Style>): CSSProperties => {
  if (!styles.length) {
    return {};
  }
  const flattenedStyles = styles.map((style) =>
    style ? (Array.isArray(style) ? flattenStyles(...style) : style) : {}
  );
  const flattenedStyle = flattenedStyles.reduce((a, b) => ({ ...a, ...b }), {});
  Object.keys(delimiters).forEach((key) => {
    flattenedStyle[key] = flattenedStyles
      .map((style) => style[key])
      .filter(Boolean)
      .join(delimiters[key]);
  });
  return flattenedStyle;
};

const truncateNumber = (n: number, sigFigs = 2) =>
  Math.floor(n * Math.pow(10, sigFigs)) / Math.pow(10, sigFigs);

const isDefaultFrameMixin = (node: any): node is DefaultFrameMixin =>
  node.type === "COMPONENT" ||
  node.type === "FRAME" ||
  node.type === "INSTANCE";

/**
 * All units in degrees and px.
 *
 * Returns the transform if it is non-unit.
 */
function serializeTransform(opts: {
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  translateX?: number;
  translateY?: number;
  skewX?: number;
  skewY?: number;
}) {
  const { scaleX, scaleY, rotation, translateX, translateY, skewX, skewY } =
    opts;
  const transforms: string[] = [];
  if (
    (scaleX !== undefined && scaleX !== 1) ||
    (scaleY !== undefined && scaleY !== 1)
  ) {
    transforms.push(`scale(${scaleX ?? 1}, ${scaleY ?? 1})`);
  }

  if (rotation !== undefined && rotation !== 0) {
    transforms.push(`rotate(${rotation}deg)`);
  }

  if (
    (skewX !== undefined && skewX !== 0) ||
    (skewY !== undefined && skewY !== 0)
  ) {
    transforms.push(`skew(${skewX ?? 0}deg, ${skewY ?? 0}deg)`);
  }

  if (
    (translateX !== undefined && translateX !== 0) ||
    (translateY !== undefined && translateY !== 0)
  ) {
    transforms.push(`translate(${translateX ?? 0}px, ${translateY ?? 0}px)`);
  }

  return transforms.length > 0 ? transforms.join(" ") : undefined;
}

export async function uploadNodeImages(nodes: SceneNode[], appCtx: AppCtx) {
  const nodeImages: Map<
    SceneNode,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  > = new Map();

  const allNodes: SceneNode[] = [];

  const dfs = (cur: SceneNode) => {
    allNodes.push(cur);
    if (
      cur.type === "COMPONENT" ||
      cur.type === "FRAME" ||
      cur.type === "INSTANCE" ||
      cur.type === "GROUP"
    ) {
      (cur.children || []).forEach(dfs);
    }
  };
  for (const node of nodes) {
    dfs(node);
  }
  for (const node of allNodes) {
    const uploadedImage = await uploadAssetFromNode(node, appCtx);
    if (uploadedImage) {
      nodeImages.set(node, uploadedImage);
    }
  }
  return nodeImages;
}

export function createNodeAssets(
  nodeImages: Map<
    SceneNode,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  >,
  siteOps: SiteOps
) {
  const nodeAssets: Map<SceneNode, { asset: ImageAsset; iconColor?: string }> =
    new Map();
  nodeImages.forEach((imageParams, node) => {
    const { imageResult, opts } = imageParams;
    const asset = siteOps.createImageAsset(imageResult, opts);
    nodeAssets.set(node, asset);
  });
  return nodeAssets;
}

export function getMainComponentName(node: InstanceNode) {
  if (!node.mainComponent) {
    return undefined;
  }
  if (isString(node.mainComponent)) {
    return node.mainComponent;
  }
  return node.mainComponent.name;
}

export function getMainComponentId(node: InstanceNode) {
  if (!node.mainComponent || isString(node.mainComponent)) {
    return undefined;
  }
  return node.mainComponent.id;
}

function findMappedComponent(node: InstanceNode, components: Component[]) {
  // First use Component.figmaMappings, which takes precedence over
  // name matching
  const mainComponentName = getMainComponentName(node);
  const mapped = components.find((c) =>
    c.figmaMappings?.some((m) => m.figmaComponentName === mainComponentName)
  );
  if (mapped) {
    return mapped;
  }

  // Next do matching with component.name
  const mapped2 = components.find((c) => c.name === mainComponentName);
  if (mapped2) {
    return mapped2;
  }

  // Finally, use display name, which is "fuzziest"
  return components.find(
    (c) => getComponentDisplayName(c) === mainComponentName
  );
}
