import {
  boxShadowNodeTypes,
  delimiters,
  invalidCodeComponentStyles,
  vectorNodeTypes,
} from "@/wab/client/figma-importer/constants";
import {
  DefaultShapeMixin,
  LayoutMixin,
  SceneNode,
  SolidPaint,
  TextNode,
} from "@/wab/client/figma-importer/plugin-types";
import { Style } from "@/wab/client/figma-importer/types";
import {
  getLayoutParent,
  hasChildren,
  isDefaultFrameMixin,
  rgbToString,
  rgbaToString,
  transformToMatrix,
  truncateNumber,
} from "@/wab/client/figma-importer/utils";
import { Matrix as AltMatrix } from "@/wab/commons/transformation-matrix";
import { assert, ensure, rad2deg } from "@/wab/shared/common";
import {
  BackgroundLayer,
  ColorFill,
  Dim,
  ImageBackground,
  LinearGradient,
  NoneBackground,
  RadialGradient,
  Stop,
  mkBackgroundLayer as mkBackgroundLayerWithDefaults,
} from "@/wab/shared/core/bg-styles";
import { mkImageAssetRef } from "@/wab/shared/core/image-assets";
import { ImageAsset } from "@/wab/shared/model/classes";
import { omit } from "lodash";
import { CSSProperties } from "react";
import {
  Matrix,
  applyToPoint,
  compose,
  inverse,
  rotate,
} from "transformation-matrix";

/**
 * All units in degrees and px.
 *
 * Returns the transform if it is non-unit.
 */
export function serializeTransform(opts: {
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

export function flattenStyles(...styles: Array<Style>): CSSProperties {
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
}

export function filterValidCodeComponentStyles(styles: CSSProperties) {
  return omit(styles, invalidCodeComponentStyles);
}

export const styleForLayoutMixinAndConstraintMixin = (
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
export const styleForLayoutMixin = (
  node: SceneNode & LayoutMixin
): CSSProperties => {
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

export const styleForBlendMixin = (node: SceneNode): Array<Style> => {
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

export const styleForTextNode = (node: TextNode): Style => {
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
                    `${truncateNumber((position * scale + offset) * 100)}`,
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
                        new Dim(`${truncateNumber(position * 100)}`, "%")
                      )
                  ),
                  cx: new Dim("50", "%"),
                  cy: new Dim("50", "%"),
                  rx: new Dim("50", "%"),
                  ry: new Dim("50", "%"),
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

export const styleForCornerMixin = (node: SceneNode): Style => {
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

export const styleForRectangleCornerMixin = (node: SceneNode): Style => {
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

export const styleForDefaultShapeMixin = (
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

export const styleForDefaultFrameMixin = (
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
        style["column-gap"] = `${node.itemSpacing}px`;
      }
      if (node.layoutWrap === "WRAP") {
        style["flex-wrap"] = "wrap";
        style["row-gap"] = `${
          node.counterAxisSpacing ?? node.itemSpacing ?? 0
        }px`;
      }
    } else if (node.layoutMode === "VERTICAL") {
      if (node.primaryAxisSizingMode === "AUTO") {
        style.height = "wrap";
      }
      if (node.counterAxisSizingMode === "AUTO") {
        style.width = "wrap";
      }
      if (node.itemSpacing > 0) {
        style["row-gap"] = `${node.itemSpacing}px`;
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

function mkBackgroundLayer(image: BackgroundLayer["image"]) {
  return mkBackgroundLayerWithDefaults(image, {
    repeat: "no-repeat",
  });
}
