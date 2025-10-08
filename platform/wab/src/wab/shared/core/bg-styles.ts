import {
  assert,
  ensure,
  removeWhere,
  tuple,
  withoutNils,
} from "@/wab/shared/common";
import {
  getCssInitial,
  parseCssNumericNew,
  showCssValues,
} from "@/wab/shared/css";
import {
  isBackgroundAttachmentKeyword,
  isBackgroundClipKeyword,
  isBackgroundOriginKeyword,
  isBackgroundPositionKeyword,
  isBackgroundRepeatKeyword,
  isBackgroundSizeKeyword,
  isRadialGradiantSizeKeyword,
} from "@/wab/shared/css/background";
import {
  extractColorFromNode,
  extractDimensionFromNode,
  extractUrlFromNode,
  findAndMap,
  isDimensionNode,
  isLinearGradientFunction,
  isRadialGradientFunction,
  isVarFunctionNode,
  splitNodesByOperator,
} from "@/wab/shared/css/css-tree-utils";
import { splitCssValue } from "@/wab/shared/css/parse";
import { CssNode, generate, parse, walk } from "css-tree";
import { pick } from "lodash";
import { CSSProperties } from "react";

// Don't allow number
type StringCSSProperties = {
  [p in keyof CSSProperties]: CSSProperties[p] & string;
};

// Hack: The extra * is intentional to avoid it being removed by `parseCssValue`
// Should be in sync with cssPegParser.
export const bgClipTextTag = `/* clip: text **/`;

// To parse the bgClipTextTag properly, we are using css-tree parser onComment callback
// which returns the comment without the surrounding /* and */ so we will just use the following value for comparison
const bgClipTextWithoutCommentsTag = "clip: text *";

export class BackgroundLayerArgs {
  image:
    | NoneBackground
    | ImageBackground
    | ColorFill
    | LinearGradient
    | RadialGradient;
  position?: StringCSSProperties["backgroundPosition"];
  size?: StringCSSProperties["backgroundSize"];
  repeat?: StringCSSProperties["backgroundRepeat"];
  origin?: StringCSSProperties["backgroundOrigin"];
  clip?: StringCSSProperties["backgroundClip"];
  attachment?: StringCSSProperties["backgroundAttachment"];
}

export class BackgroundLayer extends BackgroundLayerArgs {
  // Should be set true only when generating stylesheets, and just for the last
  // layer (`"background-color"` prop shouldn't go into the model).
  preferBackgroundColorOverColorFill: boolean = false;
  constructor(args: BackgroundLayerArgs) {
    super();
    Object.assign(
      this,
      pick(
        args,
        "image",
        "position",
        "size",
        "repeat",
        "origin",
        "clip",
        "attachment"
      )
    );
  }

  static fromCss(value: string) {
    let clip: string | undefined;

    const valueAst = parse(value, {
      context: "value",
      onComment: (comment) => {
        if (comment.trim() === bgClipTextWithoutCommentsTag) {
          clip = bgClipTextTag;
        }
      },
    });
    if (valueAst.type !== "Value") {
      return null;
    }

    let image: BackgroundLayer["image"] | null = null;
    let position: string | undefined;
    let size: string | undefined;
    let repeat: string | undefined;
    let origin: string | undefined;
    let attachment: string | undefined;

    // Track position for parsing position/size syntax
    let foundSlash = false;
    const positionNodes: CssNode[] = [];
    const sizeNodes: CssNode[] = [];

    walk(valueAst, (node) => {
      /**
       * processing each node in the order of the formal syntax defined in the css spec https://developer.mozilla.org/en-US/docs/Web/CSS/background#formal_syntax
       * <bg-layer> =
       *   <bg-image>                      ||
       *   <bg-position> [ / <bg-size> ]?  ||
       *   <repeat-style>                  ||
       *   <attachment>                    ||
       *   <visual-box>                    ||
       *   <visual-box>
       */

      // Handles <bg-image>
      if (!image) {
        image = parseBackgroundLayerImage(node);
        if (image) {
          return walk.skip;
        }
      }

      // Handle <bg-position> [ / <bg-size> ]
      // According to MDN, the <bg-size> value may only be included
      // immediately after <position>, separated with the '/' character,
      // like this: "center/80%".
      if (node.type === "Operator" && node.value === "/") {
        foundSlash = true;
        return walk.skip;
      }

      if (
        isDimensionNode(node) ||
        isVarFunctionNode(node) ||
        (node.type === "Identifier" &&
          isBackgroundPositionKeyword(node.name)) ||
        (node.type === "Identifier" && isBackgroundSizeKeyword(node.name))
      ) {
        if (!foundSlash) {
          positionNodes.push(node);
        } else {
          sizeNodes.push(node);
        }
        return walk.skip;
      }

      if (node.type === "Identifier") {
        const identifierName = node.name;

        // Handles <repeat-style>
        if (isBackgroundRepeatKeyword(identifierName) && !repeat) {
          repeat = identifierName;
          return walk.skip;
        }

        // Background attachment
        if (isBackgroundAttachmentKeyword(identifierName) && !attachment) {
          attachment = identifierName;
          return walk.skip;
        }

        // Background origin/clip values
        if (isBackgroundOriginKeyword(identifierName) && !origin) {
          origin = identifierName;
          return walk.skip;
        }

        if (isBackgroundClipKeyword(identifierName) && !clip) {
          clip = identifierName;
          return walk.skip;
        }
      }

      return;
    });

    if (positionNodes.length > 0) {
      position = positionNodes.map((n) => generate(n)).join(" ");
    }
    if (sizeNodes.length > 0) {
      size = sizeNodes.map((n) => generate(n)).join(" ");
    }

    // Default to none background if no image found
    if (!image) {
      image = new NoneBackground();
    }

    return new BackgroundLayer({
      image,
      position,
      size,
      repeat,
      origin,
      clip,
      attachment,
    });
  }

  isNoneLayer() {
    return this.image instanceof NoneBackground;
  }
  hasTextClip() {
    return this.clip === "text" || this.clip === bgClipTextTag;
  }
  showCss() {
    if (this.isNoneLayer()) {
      return this.image.showCss();
    }

    const imageOrColor =
      this.preferBackgroundColorOverColorFill && this.image instanceof ColorFill
        ? this.image.color
        : this.image.showCss();

    if (this.image instanceof ColorFill) {
      // ColorFill doesn't offer any other controls, so we should fill the entire
      // picture
      return `${imageOrColor}`;
    }

    let size = this.size,
      position = this.position;
    // According to MDN, the <bg-size> value may only be included
    // immediately after <position>, separated with the '/' character,
    // like this: "center/80%".
    if (size) {
      if (!position) {
        position = getCssInitial("background-position", "div");
      }
      size = `/ ${size}`;
    }

    if (this.clip || this.origin) {
      // If background-clip and background-origin should have different values,
      // we need to set both (see W3C background spec
      // https://www.w3.org/TR/css-backgrounds-3/#background )
      this.clip = this.clip || getCssInitial("background-clip", "div");
      this.origin = this.origin || getCssInitial("background-origin", "div");
    }

    // "background-clip: text" does not work in the shorthand - it must be set
    // globally, separated and after the background shorthand.
    const clip = this.hasTextClip() ? bgClipTextTag : this.clip;
    return `${imageOrColor} ${position ?? ""} ${size ?? ""} ${
      this.repeat ?? ""
    } ${this.origin ?? ""} ${clip ?? ""} ${this.attachment ?? ""}`
      .replace(/\s+/g, " ")
      .trim();
  }
}

export function mkBackgroundLayer(
  image: BackgroundLayer["image"],
  overrides?: Omit<BackgroundLayerArgs, "image">
) {
  return new BackgroundLayer({
    image,
    position: getCssInitial("background-position", "div"),
    size: getCssInitial("background-size", "div"),
    repeat: "repeat",
    ...(overrides ?? {}),
  });
}

export class BackgroundArgs {
  layers: BackgroundLayer[];
}

export class Background extends BackgroundArgs {
  constructor(args: BackgroundArgs) {
    super();
    Object.assign(this, pick(args, "layers"));
  }
  static fromCss(value: string): Background {
    if (!value || value.trim() === "none") {
      return new Background({
        layers: [mkBackgroundLayer(new NoneBackground())],
      });
    }

    // Split by commas to handle multiple background layers
    const layerValues = splitCssValue("background", value);

    const layers: BackgroundLayer[] = [];
    for (const layerValue of layerValues) {
      const layer = BackgroundLayer.fromCss(layerValue);
      if (layer) {
        layers.push(layer);
      }
    }

    return new Background({ layers });
  }
  // Remove "none" layers
  filterNoneLayers() {
    removeWhere(this.layers, (l) => l.isNoneLayer());
  }
  // Return true if any layer has "background-clip: text"
  hasTextClip() {
    return this.layers.some((l) => l.hasTextClip());
  }
  showCss() {
    return showCssValues(
      "background",
      this.layers.map((l) => l.showCss())
    );
  }
}

// background: none
export class NoneBackground {
  static fromCss(value: string) {
    if (value.trim() === "none") {
      return new NoneBackground();
    }

    return null;
  }

  showCss() {
    return "none";
  }
}

export class ImageBackgroundArgs {
  url: string;
}
export class ImageBackground extends ImageBackgroundArgs {
  constructor(args: ImageBackgroundArgs) {
    super();
    Object.assign(this, pick(args, "url"));
  }
  static fromCss(value: string) {
    const valueAst = parse(value, { context: "value" });
    if (valueAst.type !== "Value") {
      return null;
    }

    const imageBackground = findAndMap(valueAst.children.toArray(), (node) =>
      parseImageBackground(node)
    );

    return imageBackground;
  }
  showCss() {
    if (this.url.startsWith("var(--")) {
      return this.url;
    } else {
      // eslint-disable-next-line no-useless-escape
      return `url(\"${this.url}\")`;
    }
  }
}

export class ColorFillArgs {
  color: string;
}

/**
 * This is a hack to provide background fill layers. CSS does not support
 * adding a background-image layer with just a color, so we create a
 * linear-gradient from ${color} to ${color} instead. Our PEG parser will
 * know the difference from ColorFill to LinearGradient because LinearGradient
 * always have an angle as the first parameter, while ColorFill has only
 * colors.
 */
export class ColorFill extends ColorFillArgs {
  constructor(args: ColorFillArgs) {
    super();
    Object.assign(this, pick(args, "color"));
  }

  static fromCss(value: string) {
    const valueAst = parse(value, { context: "value" });
    if (valueAst.type !== "Value") {
      return null;
    }
    if (!valueAst.children.first) {
      return null;
    }

    return parseColorFill(valueAst.children.first);
  }

  showCss() {
    return `linear-gradient(${this.color}, ${this.color})`;
  }
}

export class LinearGradientArgs {
  repeating: boolean;
  angle: number;
  stops: Stop[];
}
export class LinearGradient extends LinearGradientArgs {
  constructor(args: LinearGradientArgs) {
    super();
    Object.assign(this, pick(args, "repeating", "angle", "stops"));
  }

  /**
   * Parses linear gradient CSS values
   *
   * Linear gradients can have various forms such as:
   * - linear-gradient(45deg, red, blue)
   * - linear-gradient(to right, #ff0000 0%, #0000ff 100%)
   * - repeating-linear-gradient(90deg, red 10px, blue 20px)
   *
   * Example AST structure for linear-gradient(45deg, red 50%, blue):
   *   Value -> Function(name: "linear-gradient") -> [
   *     Dimension(value: 45, unit: "deg"),
   *     Operator(value: ","),
   *     Identifier(name: "red"),
   *     Dimension(value: 50, unit: "%"),
   *     Operator(value: ","),
   *     Identifier(name: "blue")
   *   ]
   *
   * Parsing strategy:
   * 1. Detect if it's repeating variant
   * 2. Parse angle (if present) - first dimension with 'deg' unit
   * 3. Split remaining arguments by commas to get color stops
   * 4. Parse each stop for color and dimension (length | percentage)
   */
  static fromCss(value: string): LinearGradient | null {
    const valueAst = parse(value, { context: "value" });
    if (valueAst.type !== "Value") {
      return null;
    }

    const linearGradient = findAndMap(valueAst.children.toArray(), (node) =>
      parseLinearGradient(node)
    );

    return linearGradient;
  }

  showCss() {
    const name = `${this.repeating ? "repeating-" : ""}linear-gradient`;
    const angle = this.angle != null ? `${this.angle}deg, ` : "";
    const stops = [...this.stops].map((stop) => stop.showCss()).join(", ");
    return `${name}(${angle}${stops})`;
  }
}

export class RadialGradientArgs {
  repeating: boolean;
  cx: Dim;
  cy: Dim;
  rx: Dim;
  ry: Dim;
  stops: Stop[];
  sizeKeyword?: string;
}
export class RadialGradient extends RadialGradientArgs {
  constructor(args: RadialGradientArgs) {
    super();
    Object.assign(
      this,
      pick(args, "repeating", "cx", "cy", "rx", "ry", "stops", "sizeKeyword")
    );
  }
  static fromCss(value: string): RadialGradient | null {
    const valueAst = parse(value, { context: "value" });
    if (valueAst.type !== "Value") {
      return null;
    }

    const gradient = findAndMap(valueAst.children.toArray(), (node) =>
      parseRadialGradient(node)
    );

    return gradient;
  }

  showCss() {
    const name = `${this.repeating ? "repeating-" : ""}radial-gradient`;
    const size =
      this.sizeKeyword ?? `ellipse ${this.rx.showCss()} ${this.ry.showCss()}`;

    const pos = `at ${this.cx.showCss()} ${this.cy.showCss()}`;

    const stops = [...this.stops]
      .map((stop: /*TWZ*/ Stop | Stop) => stop.showCss())
      .join(", ");
    return `${name}(${size} ${pos}, ${stops})`;
  }
}

export const STOP_DIM_MISSING_IDENTIFIER = "DIM_MISSING";
export class Stop {
  constructor(public color: string, public dim: Dim) {
    this.color = color;
    this.dim = dim;
  }
  static fromCss(value: string) {
    const valueAst = parse(value, { context: "value" });
    if (valueAst.type !== "Value") {
      return null;
    }

    return parseStop(valueAst.children.toArray());
  }

  clone() {
    return new Stop(this.color, this.dim);
  }
  showCss() {
    assert(
      this.dim.unit !== STOP_DIM_MISSING_IDENTIFIER,
      `Dim.unit cannot be ${STOP_DIM_MISSING_IDENTIFIER}.`
    );
    return withoutNils(tuple(this.color, this.dim.showCss())).join(" ");
  }
}

export class Dim {
  constructor(public value: number, public unit: string) {}
  showCss() {
    return `${this.value}${this.unit}`;
  }
  setValue(v: string) {
    const parsed = parseCssNumericNew(v);
    if (parsed !== undefined) {
      this.value = parsed.num;
      this.unit = parsed.units;
    } else {
      ensure(parsed);
    }
  }
  static fromCss(value: string) {
    const { num, units } = ensure(
      parseCssNumericNew(value),
      "Unexpected undefined css numeric value"
    );
    return new Dim(num, units);
  }
}

export class BoxShadowArgs {
  inset: boolean | number;
  x: Dim;
  y: Dim;
  blur: Dim;
  spread: Dim;
  color: string;
}
export class BoxShadow extends BoxShadowArgs {
  constructor(args: BoxShadowArgs) {
    super();
    Object.assign(
      this,
      pick(args, "inset", "x", "y", "blur", "spread", "color")
    );
  }
  showCss() {
    const inset = this.inset ? "inset " : "";
    const parts = [this.x, this.y, this.blur, this.spread].map((x: Dim) =>
      x.showCss()
    );
    return `${inset}${parts.join(" ")} ${this.color}`;
  }
}

export class BoxShadows {
  shadows: BoxShadow[];
  constructor(shadows: BoxShadow[]) {
    this.shadows = shadows;
  }
  static fromCss(value: string) {
    if (!value.trim()) {
      return new BoxShadows([]);
    }

    const valueAst = parse(value, { context: "value" });
    if (valueAst.type !== "Value") {
      return new BoxShadows([]);
    }

    /* valueAst represent a Value node for box-shadow property, it will have children node such as
     * Identifier -> inset, Dimension -> length, Function -> rgb(), var(), Hash -> hex color,
     * Most importantly, in case of multiple shadows which are separated using comma, we have an Operator node
     * that represents the comma.
     *
     * To collect individual box-shadow, we need to collect all the nodes between each Operator node. For example,
     * box-shadow: 2px 4px #fff, 0px 3px rgb(0,0,0,0.5) will be represented as
     * [ Dimension, Dimension, Hash, Operator, Dimension, Dimension, Function ] and converted to
     * [ [Dimension, Dimension, Hash], [Dimension, Dimension, Function] ]
     */
    const shadowsList = splitNodesByOperator(valueAst.children.toArray(), ",");

    return new BoxShadows(shadowsList.map((shadow) => parseBoxShadow(shadow)));
  }

  showCss() {
    return this.shadows.map((s: /*TWZ*/ BoxShadow) => s.showCss()).join(", ");
  }
}

/**
 * Parse a single box-shadow AST nodes into the following format:
 *   "[inset] offsetX offsetY blurRadius spreadRadius color"
 */
function parseBoxShadow(shadowNodes: CssNode[]) {
  let inset = false;
  let color: string | null = null;
  const dims: Dim[] = [];

  for (const node of shadowNodes) {
    if (node.type === "Identifier" && node.name.toLowerCase() === "inset") {
      inset = true;
    }

    if (!color) {
      color = extractColorFromNode(node);
    }

    const dim = extractDimensionFromNode(node);
    if (dim) {
      dims.push(dim);
    }
  }

  while (dims.length < 4) {
    dims.push(new Dim(0, "px"));
  }

  if (!color) {
    color = "currentcolor";
  }

  const [x, y, blur, spread] = dims;
  return new BoxShadow({
    inset,
    x,
    y,
    blur,
    spread,
    color,
  });
}

/**
 * Parses background image from a CSS AST node
 */
function parseImageBackground(node: CssNode) {
  if (node.type === "Url" || node.type === "String" || node.type === "Raw") {
    const url = extractUrlFromNode(node);
    if (url) {
      return new ImageBackground({ url });
    }
  }

  const value = generate(node);
  if (
    node.type === "Function" &&
    node.name === "var" &&
    // Used for image assets ref
    value.startsWith("var(--image-")
  ) {
    return new ImageBackground({ url: generate(node) });
  }

  return null;
}

/**
 * Parses background image from a CSS AST node
 */
function parseBackgroundLayerImage(
  node: CssNode
): BackgroundLayer["image"] | null {
  if (node.type === "Identifier" && node.name === "none") {
    return new NoneBackground();
  }

  const imageBackground = parseImageBackground(node);
  if (imageBackground) {
    return imageBackground;
  }

  const colorFill = parseColorFill(node);
  if (colorFill) {
    return colorFill;
  }

  const linearGradient = parseLinearGradient(node);
  if (linearGradient) {
    return linearGradient;
  }

  const radialGradient = parseRadialGradient(node);
  if (radialGradient) {
    return radialGradient;
  }

  return null;
}

/**
 * Parses a linear gradient function as a Color fill in case of same start and end color,
 *
 * This is a hack to provide background fill layers. CSS does not support
 * adding a background-image layer with just a color, so we create a
 * linear-gradient from ${color} to ${color} instead
 *
 * Example
 * - linear-gradient(red, red);
 * - linear-gradient(#fff000, #fff000);
 *
 * @param node The CSS AST node to parse
 * @returns ColorFill, otherwise null
 */
function parseColorFill(node: CssNode) {
  let colorFill: ColorFill | null = null;
  if (isLinearGradientFunction(node)) {
    const args = splitNodesByOperator(node.children.toArray(), ",");

    // Check if this is a ColorFill (gradient with same start and end color)
    const firstColorNode = args[0][0];
    const secondColorNode = args[1][0];
    if (args.length === 2 && firstColorNode && secondColorNode) {
      const color1 = extractColorFromNode(firstColorNode);
      const color2 = extractColorFromNode(secondColorNode);
      if (color1 && color2 && color1 === color2) {
        colorFill = new ColorFill({ color: color1 });
      }
    }
  }

  if (!colorFill) {
    const color = extractColorFromNode(node);
    if (color) {
      colorFill = new ColorFill({ color });
    }
  }

  return colorFill;
}

/**
 * Parses a linear gradient function,
 *
 * https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/linear-gradient#formal_syntax
 * <linear-gradient()> =
 *   linear-gradient( [ <linear-gradient-syntax> ] )
 *
 * <linear-gradient-syntax> =
 *   [ <angle> | <zero> | to <side-or-corner> ]? , <color-stop-list>
 *
 * @param node The CSS AST node to parse
 * @returns LinearGradient, otherwise null
 */
function parseLinearGradient(node: CssNode) {
  if (!isLinearGradientFunction(node)) {
    return null;
  }
  const isRepeatingLinear = node.name === "repeating-linear-gradient";

  const stopGroups = splitNodesByOperator(node.children.toArray(), ",");

  /* Analyze each group to determine if it's an angle or color stop
   * For example, for gradient repeating-linear-gradient(90deg, red 10px, blue 20px)
   * we have angle stop "90deg" and color stops as "red 10px" and "blue 20px"
   *
   * Default value of the angle is "to bottom" which is equivalent to 180deg
   */
  let angle: number = 180;
  const colorStopsGroups: CssNode[][] = [];

  for (const group of stopGroups) {
    let isAngleGroup = false;

    // Check if this group contains an angle (first dimension with 'deg' unit)
    for (const groupNode of group) {
      const angleDim = extractDimensionFromNode(groupNode);
      if (angleDim?.unit === "deg") {
        angle = angleDim.value;
        isAngleGroup = true;
        break;
      }
    }

    // If not an angle group, treat as color stop
    if (!isAngleGroup) {
      colorStopsGroups.push(group);
    }
  }

  const stops = parseStopGroups(colorStopsGroups);

  return new LinearGradient({ repeating: isRepeatingLinear, angle, stops });
}

function parseRadialGradient(node: CssNode): RadialGradient | null {
  if (!isRadialGradientFunction(node)) {
    return null;
  }

  const repeating = node.name === "repeating-radial-gradient";

  let cx: Dim | null = null;
  let cy: Dim | null = null;
  let rx: Dim | null = null;
  let ry: Dim | null = null;
  let sizeKeyword: string | undefined;

  // According to MDN, formal syntax is
  // <radial-gradient-syntax> = [ <radial-shape> || <radial-size> ]? [ at <position> ]? , <color-stop-list>

  // Split the argument list at commas first
  const argGroups = splitNodesByOperator(node.children.toArray(), ",");
  const firstGroup = argGroups[0];
  /**
   * Since the first group [ <radial-shape> || <radial-size> ]? [ at <position> ]? is completely optional and a
   * radial gradient can only have color stops as well such as "radial-gradient(cyan 0%, transparent 20%, salmon 40%)", we need
   * to first check if the first group has any color, otherwise just parse it as a shape | size | position.
   */

  const firstGroupHasColor = findAndMap(firstGroup, extractColorFromNode);

  if (!firstGroupHasColor) {
    // Parse (shape || size) and optional “at <position>” i.e [ <radial-shape> || <radial-size> ]? [ at <position> ]?
    const shapeSizePosGroup = firstGroup;
    let foundAt = false;
    const shapeOrSizeNodes: CssNode[] = [];
    const positionNodes: CssNode[] = [];

    for (const currNode of shapeSizePosGroup) {
      if (
        currNode.type === "Identifier" &&
        currNode.name === "at" &&
        !foundAt
      ) {
        foundAt = true;
        continue;
      }
      if (foundAt) {
        // collect position nodes appearing after "at" keyword
        positionNodes.push(currNode);
      } else {
        // collect shape | size nodes appearing before "at" keyword
        shapeOrSizeNodes.push(currNode);
      }
    }

    // parse [ <radial-shape> || <radial-size> ] nodes
    for (const currNode of shapeOrSizeNodes) {
      if (
        currNode.type === "Identifier" &&
        isRadialGradiantSizeKeyword(currNode.name)
      ) {
        sizeKeyword = currNode.name;
        continue;
      }
      const dim = extractDimensionFromNode(currNode);
      if (dim) {
        if (!rx) {
          rx = dim;
        } else if (!ry) {
          ry = dim;
        }
      }
    }

    // parse  [ at <position> ] nodes
    const posDims: Dim[] = [];
    for (const currNode of positionNodes) {
      const dim = extractDimensionFromNode(currNode);
      if (dim) {
        posDims.push(dim);
      }

      if (currNode.type === "Identifier") {
        switch (currNode.name) {
          case "left":
          case "top":
            posDims.push(new Dim(0, "%"));
            break;
          case "center":
            posDims.push(new Dim(50, "%"));
            break;
          case "right":
          case "bottom":
            posDims.push(new Dim(100, "%"));
            break;
        }
      }
    }

    if (posDims.length === 1) {
      cx = cy = posDims[0];
    } else if (posDims.length >= 2) {
      [cx, cy] = posDims;
    }
  }

  // If *every* coordinate/radius is still null, treat first group as colour stop
  const colorStopsGroup = firstGroupHasColor ? argGroups : argGroups.splice(1);
  const stops = parseStopGroups(colorStopsGroup);

  return new RadialGradient({
    repeating,
    cx: cx ?? new Dim(50, "%"),
    cy: cy ?? new Dim(50, "%"),
    rx: rx ?? new Dim(50, "%"),
    ry: ry ?? new Dim(50, "%"),
    stops,
    sizeKeyword,
  });
}

/**
 * Parses a linear color stop such as "black 80%", "#fff000 10%"
 *
 * <linear-color-stop> =
 *   <color> <length-percentage>?
 *
 * Each color stop has a Color and an optional Dimension. In case no dimensions
 * are found, we will set it's unit to a unique keyword STOP_DIM_MISSING_IDENTIFIER. This hack is
 * needed so we can use this keyword in places where we want to interpolate
 * missing dimension values while keeping the dim as required field in Stop class
 * which is also necessary for now such as in ColorStops for ColorPicker
 * in Background Section
 *
 * @param nodes A list of CSS AST nodes to parse
 * @returns Stop, otherwise null
 */
function parseStop(nodes: CssNode[]) {
  const color = findAndMap(nodes, extractColorFromNode);
  const dim = findAndMap(nodes, extractDimensionFromNode);

  if (color) {
    return new Stop(color, dim ?? new Dim(0, STOP_DIM_MISSING_IDENTIFIER));
  }

  return null;
}

function parseStopGroups(stopGroups: CssNode[][]) {
  const stops: Stop[] = [];
  for (const stopGroup of stopGroups) {
    const stop = parseStop(stopGroup);
    if (stop) {
      stops.push(stop);
    }
  }

  linearlyInterpolateMissingStopDimensions(stops);
  return stops;
}

/**
 * Ensures that each stop has a dim value present. In the MDN Formal Syntax for
 * <color-stop-list> length can be optional, however it's required for Studio design
 * section code such as ColorStops in the Gradient UI picker.
 *
 * To ensure that each dim has a proper dimension value if not present, we will
 * use linear interpolation to fill the missing values.
 *
 * Examples
 * - linear-gradient(45deg, red, blue) -> linear(45deg, red 0%, blue 100%)
 * - linear-gradient(45deg, red, green, blue) -> linear(45deg, red 0%, green 50%, blue 100%)
 * - linear-gradient(45deg, red, yellow, green 90%, blue) -> linear(45deg, red 0%, yellow 45%, green 90%, blue 100%)
 *
 * Strategy:
 * - leading color stop is always set to 0%
 * - trailing color stop is always set to 100%
 * - fill the missing values between two specified values using linear interpolation
 *
 * Considering the above example linear-gradient(45deg, red, yellow, green 90%, blue)
 * - red becomes 0%
 * - blue becomes 100%
 * - yellow being missing in between red 0% and green 90% will be interpolated as 45%
 */
function linearlyInterpolateMissingStopDimensions(stops: Stop[]) {
  if (stops.every((s) => s.dim.unit !== STOP_DIM_MISSING_IDENTIFIER)) {
    return;
  }

  /** Build an ordered list of Anchors
   * An anchor is a stop that already has a position or
   * a synthetic boundary at 0 % (start) / 100 % (end).
   */
  type Anchor = { idx: number; pos: number };
  const anchors: Anchor[] = [];

  if (stops[0].dim.unit === STOP_DIM_MISSING_IDENTIFIER) {
    stops[0].dim = new Dim(0, "%");
  }

  const lastIdx = stops.length - 1;
  if (stops[lastIdx].dim.unit === STOP_DIM_MISSING_IDENTIFIER) {
    stops[lastIdx].dim = new Dim(100, "%");
  }

  // collect Anchor values where dim value exists
  stops.forEach((s, i) => {
    if (s.dim.unit !== STOP_DIM_MISSING_IDENTIFIER) {
      anchors.push({ idx: i, pos: s.dim.value });
    }
  });

  // Walk consecutive anchor pairs & fill gaps using linear interpolation
  for (let anchor = 0; anchor < anchors.length - 1; anchor++) {
    const anchor1 = anchors[anchor];
    const anchor2 = anchors[anchor + 1];

    const gap = anchor2.idx - anchor1.idx;
    if (gap <= 1) {
      // There is no gap between these two anchors so nothing to fill here.
      continue;
    }

    // linear interpolation for each missing stop between two anchors
    for (let itemNumber = 1; itemNumber < gap; itemNumber++) {
      const amount = itemNumber / gap;

      // Lerp function for linear interpolation
      const pos = anchor1.pos + (anchor2.pos - anchor1.pos) * amount;
      stops[anchor1.idx + itemNumber].dim = new Dim(pos, "%");
    }
  }
}
