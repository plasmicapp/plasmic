import { withoutNils } from "@/wab/shared/common";
import { Dim } from "@/wab/shared/core/bg-styles";
import {
  Angle,
  Length,
  LengthOrPercentage,
  NumberOrPercentage,
  UnitlessNumber,
  getAllowedUnitsForType,
} from "@/wab/shared/css/types";
import { CssNode, generate, parse } from "css-tree";

/**
 * Transform type - base type of supported CSS function names
 */
export type TransformType =
  | "translate"
  | "rotate"
  | "scale"
  | "skew"
  | "perspective";

/**
 * Transform dimension names
 */
export type TransformDimension = "X" | "Y" | "Z" | "angle";

export const defaultCssTransform: Record<TransformType, string> = {
  translate: "translate3d(0px, 0px, 0px)",
  rotate: "rotate3d(0, 0, 0, 0deg)",
  scale: "scale(1, 1, 1)",
  skew: "skew(0deg, 0deg)",
  perspective: "perspective(none)",
};

/**
 * Abstract base class for CSS transform functions
 */
export abstract class CssTransform {
  abstract readonly type: TransformType;
  abstract readonly allowedUnits: Record<string, string[]>;
  abstract showCss(): string;

  /**
   * Gets display text for showing in the UI
   * @returns Formatted string showing all dimension values
   */
  abstract getDisplayText(): string;

  /**
   * Creates a new transform instance with an updated dimension value
   * @param updates An object with dimension to update (X, Y, Z, angle) and it's value
   * @returns A new transform instance with the updated value
   */
  abstract clone(
    updates: Partial<Record<TransformDimension, string>>
  ): CssTransform;

  /**
   * Parses a CSS transform string into a CssTransform object
   *
   * Supports both axis-specific functions (translateX, rotateY, etc.) and
   * shorthand functions (translate, scale, rotate, etc.)
   *
   * Note: If the value contains multiple transform functions, only the first one is parsed.
   * For multiple transforms, use CssTransforms.fromCss() instead.
   *
   * @param value CSS transform string (e.g., "translateX(10px)")
   * @returns CssTransform object or null if parsing fails
   */
  static fromCss(value: string): CssTransform | null {
    if (!value || value.trim() === "" || value === "none") {
      return null;
    }

    const valueAst = parse(value, { context: "value" });
    if (valueAst.type !== "Value") {
      return null;
    }

    const transformFunction = extractTransformFunction(
      valueAst.children.toArray()
    );
    if (!transformFunction) {
      return null;
    }

    // Parse only the first transform function
    return parseTransformFunction(transformFunction);
  }
}

/**
 * Represents a translate transform
 */
export class TranslateTransform extends CssTransform {
  readonly type = "translate" as const;
  readonly allowedUnits = {
    X: getAllowedUnitsForType("LengthOrPercentage"),
    Y: getAllowedUnitsForType("LengthOrPercentage"),
    Z: getAllowedUnitsForType("LengthOrPercentage"),
  };

  constructor(
    readonly X: LengthOrPercentage,
    readonly Y: LengthOrPercentage,
    readonly Z: LengthOrPercentage
  ) {
    super();
  }

  getDisplayText() {
    return `${this.X},${this.Y},${this.Z}`;
  }

  clone(
    updates: Partial<Record<TransformDimension, LengthOrPercentage>>
  ): TranslateTransform {
    return new TranslateTransform(
      updates.X ?? this.X,
      updates.Y ?? this.Y,
      updates.Z ?? this.Z
    );
  }

  showCss() {
    return `translate3d(${this.X}, ${this.Y}, ${this.Z})`;
  }
}

/**
 * Represents a rotate transform
 */
export class RotateTransform extends CssTransform {
  readonly type = "rotate" as const;
  readonly allowedUnits = {
    X: getAllowedUnitsForType("UnitlessNumber"),
    Y: getAllowedUnitsForType("UnitlessNumber"),
    Z: getAllowedUnitsForType("UnitlessNumber"),
    angle: getAllowedUnitsForType("Angle"),
  };

  constructor(
    readonly X: UnitlessNumber,
    readonly Y: UnitlessNumber,
    readonly Z: UnitlessNumber,
    readonly angle: Angle
  ) {
    super();
  }

  getDisplayText(): string {
    return `${this.X},${this.Y},${this.Z},${this.angle}`;
  }

  clone(
    updates: Partial<{
      X: UnitlessNumber;
      Y: UnitlessNumber;
      Z: UnitlessNumber;
      angle: Angle;
    }>
  ): RotateTransform {
    return new RotateTransform(
      updates.X ?? this.X,
      updates.Y ?? this.Y,
      updates.Z ?? this.Z,
      updates.angle ?? this.angle
    );
  }

  showCss() {
    return `rotate3d(${this.X}, ${this.Y}, ${this.Z}, ${this.angle})`;
  }
}

/**
 * Represents a scale transform
 */
export class ScaleTransform extends CssTransform {
  readonly type = "scale" as const;
  readonly allowedUnits = {
    X: getAllowedUnitsForType("UnitlessNumber"),
    Y: getAllowedUnitsForType("UnitlessNumber"),
    Z: getAllowedUnitsForType("UnitlessNumber"),
  };

  constructor(
    readonly X: UnitlessNumber,
    readonly Y: UnitlessNumber,
    readonly Z: UnitlessNumber
  ) {
    super();
  }

  getDisplayText() {
    return `${this.X},${this.Y},${this.Z}`;
  }

  clone(
    updates: Partial<Record<TransformDimension, UnitlessNumber>>
  ): ScaleTransform {
    return new ScaleTransform(
      updates.X ?? this.X,
      updates.Y ?? this.Y,
      updates.Z ?? this.Z
    );
  }

  showCss() {
    return `scale3d(${this.X}, ${this.Y}, ${this.Z})`;
  }
}

/**
 * Represents a skew transform
 */
export class SkewTransform extends CssTransform {
  readonly type = "skew" as const;
  readonly allowedUnits = {
    X: getAllowedUnitsForType("Angle"),
    Y: getAllowedUnitsForType("Angle"),
  };

  constructor(readonly X: Angle, readonly Y: Angle) {
    super();
  }

  getDisplayText() {
    return `${this.X},${this.Y}`;
  }

  clone(updates: Partial<Record<TransformDimension, Angle>>): SkewTransform {
    return new SkewTransform(updates.X ?? this.X, updates.Y ?? this.Y);
  }

  showCss() {
    return `skew(${this.X}, ${this.Y})`;
  }
}

/**
 * Represents a perspective transform
 */
export class PerspectiveTransform extends CssTransform {
  readonly type = "perspective" as const;
  readonly allowedUnits = {
    X: getAllowedUnitsForType("Length"),
  };

  constructor(readonly X: Length | "none") {
    super();
  }

  getDisplayText() {
    return this.X;
  }

  clone(
    updates: Partial<Record<TransformDimension, Length | "none">>
  ): PerspectiveTransform {
    return new PerspectiveTransform(updates.X ?? this.X);
  }

  showCss() {
    return `perspective(${this.X})`;
  }
}

/**
 * Represents multiple CSS transforms along with optional perspective
 *
 * The CSS transform property can contain multiple transform functions:
 * transform: translateX(10px) rotateZ(45deg) scale(2);
 *
 */
export class CssTransforms {
  transforms: CssTransform[];
  perspective?: string; // Self perspective, e.g., "500px"

  constructor(transforms: CssTransform[], perspective?: string) {
    this.transforms = transforms;
    this.perspective = perspective;
  }

  /**
   * Parses a CSS transform value into CssTransforms
   *
   * Handles multiple transforms separated by spaces and the perspective() function
   *
   * @param value CSS transform value (e.g., "perspective(500px) translateX(10px) rotateZ(45deg)")
   * @returns CssTransforms object
   */
  static fromCss(value: string): CssTransforms {
    if (!value || value.trim() === "" || value === "none") {
      return new CssTransforms([]);
    }

    const valueAst = parse(value, { context: "value" });
    if (valueAst.type !== "Value") {
      return new CssTransforms([]);
    }

    // Store individual transform functions in a list i.e "perspective(500px) translateX(10) rotate(45deg)" to
    // ["perspective(500px)", "translateX(10)", "rotate(45deg)"]
    const functionNodeValues: string[] = [];
    for (const node of valueAst.children.toArray()) {
      if (node.type === "Function" && isTransformFunctionKeyword(node.name)) {
        functionNodeValues.push(generate(node));
      }
    }

    const transforms = withoutNils(
      functionNodeValues.map((funcVal) => CssTransform.fromCss(funcVal))
    );

    const perspectiveTransform = transforms.find(
      (t): t is PerspectiveTransform => t.type === "perspective"
    );
    const restTransforms = transforms.filter((t) => t.type !== "perspective");

    return new CssTransforms(restTransforms, perspectiveTransform?.X);
  }

  /**
   * Converts this CssTransforms to a CSS string
   *
   * @returns CSS transform value
   */
  showCss(): string {
    const parts: string[] = [];

    // Add perspective first if present
    if (this.perspective) {
      parts.push(`perspective(${this.perspective})`);
    }

    // Add all transforms
    parts.push(...this.transforms.map((t) => t.showCss()));

    return parts.length > 0 ? parts.join(" ") : "none";
  }
}

/**
 * All valid CSS transform function names
 */
export const transformFunctionKeywords = [
  "matrix",
  "matrix3d",
  "translate",
  "translate3d",
  "translateX",
  "translateY",
  "translateZ",
  "scale",
  "scale3d",
  "scaleX",
  "scaleY",
  "scaleZ",
  "rotate",
  "rotate3d",
  "rotateX",
  "rotateY",
  "rotateZ",
  "skew",
  "skewX",
  "skewY",
  "perspective",
] as const;

export type TransformFunctionKeyword =
  (typeof transformFunctionKeywords)[number];

export function isTransformFunctionKeyword(
  name: string
): name is TransformFunctionKeyword {
  return transformFunctionKeywords.includes(name as TransformFunctionKeyword);
}

type TransformFunction =
  | {
      name: "translate";
      args: [LengthOrPercentage] | [LengthOrPercentage, LengthOrPercentage];
    }
  | {
      name: "translate3d";
      args: [LengthOrPercentage, LengthOrPercentage, Length];
    }
  | { name: "translateX"; args: [LengthOrPercentage] }
  | { name: "translateY"; args: [LengthOrPercentage] }
  | { name: "translateZ"; args: [LengthOrPercentage] }
  | { name: "rotate"; args: [Angle] }
  | { name: "rotateZ"; args: [Angle] }
  | { name: "rotateX"; args: [Angle] }
  | { name: "rotateY"; args: [Angle] }
  | {
      name: "rotate3d";
      args: [UnitlessNumber, UnitlessNumber, UnitlessNumber, Angle];
    }
  | { name: "scale"; args: [UnitlessNumber] | [UnitlessNumber, UnitlessNumber] }
  | { name: "scaleX"; args: [UnitlessNumber] }
  | { name: "scaleY"; args: [UnitlessNumber] }
  | { name: "scaleZ"; args: [UnitlessNumber] }
  | {
      name: "scale3d";
      args: [NumberOrPercentage, NumberOrPercentage, NumberOrPercentage];
    }
  | { name: "skew"; args: [Angle] | [Angle, Angle] }
  | { name: "skewX"; args: [Angle] }
  | { name: "skewY"; args: [Angle] }
  | { name: "perspective"; args: [Length | "none"] }
  | { name: "matrix"; args: string[] }
  | { name: "matrix3d"; args: string[] };

/**
 * Extracts transform functions from CSS AST nodes
 */
function extractTransformFunction(nodes: CssNode[]): TransformFunction | null {
  const functions: TransformFunction[] = [];

  for (const node of nodes) {
    if (node.type === "Function" && isTransformFunctionKeyword(node.name)) {
      const args: string[] = [];

      // Extract arguments from function
      for (const child of node.children) {
        // Skip operator nodes (commas, etc.)
        if (child.type !== "Operator") {
          args.push(generate(child));
        }
      }

      functions.push({ name: node.name, args } as TransformFunction);
    }
  }

  return functions[0] ?? null;
}

/**
 * Parses a single transform function into a CssTransform object
 *
 * Each CSS transform function becomes a separate transform object.
 * Uses a simple, explicit switch statement for clarity.
 *
 * Examples:
 * - translateX(10px) -> new TranslateTransform("10px", "0px", "0px")
 * - rotateZ(45deg) -> new RotateTransform("0", "0", "1", "45deg")
 * - translate(10px, 20px) -> new TranslateTransform("10px", "20px", "0px")
 */
function parseTransformFunction(func: TransformFunction): CssTransform | null {
  const { name, args } = func;

  switch (name) {
    // Translate functions
    case "translate":
      return new TranslateTransform(args[0], args[1] || "0px", "0px");

    case "translate3d":
      return new TranslateTransform(args[0], args[1], args[2]);

    case "translateX":
      return new TranslateTransform(args[0], "0px", "0px");

    case "translateY":
      return new TranslateTransform("0px", args[0], "0px");

    case "translateZ":
      return new TranslateTransform("0px", "0px", args[0]);

    // Rotate functions
    case "rotate":
    case "rotateZ":
      return new RotateTransform("0", "0", "1", args[0]);

    case "rotateX":
      return new RotateTransform("1", "0", "0", args[0]);

    case "rotateY":
      return new RotateTransform("0", "1", "0", args[0]);

    case "rotate3d":
      return new RotateTransform(args[0], args[1], args[2], args[3]);

    // Scale functions
    case "scale":
      return new ScaleTransform(
        args[0],
        args.length === 2 ? args[1] : args[0], // scale(2) equals scale(2, 2)
        "1"
      );

    case "scale3d":
      return new ScaleTransform(args[0], args[1], args[2]);

    case "scaleX":
      return new ScaleTransform(args[0], "1", "1");

    case "scaleY":
      return new ScaleTransform("1", args[0], "1");

    case "scaleZ":
      return new ScaleTransform("1", "1", args[0]);

    // Skew functions
    case "skew":
      return new SkewTransform(args[0], args[1] || "0deg");

    case "skewX":
      return new SkewTransform(args[0], "0deg");

    case "skewY":
      return new SkewTransform("0deg", args[0]);

    // Perspective function
    case "perspective":
      return new PerspectiveTransform(args[0]);

    // Unsupported functions
    case "matrix":
    case "matrix3d":
      return null;
  }
}

export const has3dComponent = (transformVal: string) => {
  const cssTransforms = CssTransforms.fromCss(transformVal);
  if (
    cssTransforms.perspective &&
    cssTransforms.perspective !== "none" &&
    cssTransforms.perspective !== "0px"
  ) {
    return true;
  }

  return cssTransforms.transforms.some((transform) => {
    if (transform instanceof SkewTransform) {
      return false;
    }

    if (transform instanceof RotateTransform) {
      return (
        Dim.fromCss(transform.angle).value !== "0" &&
        Dim.fromCss(transform.X).value !== "0" &&
        Dim.fromCss(transform.Y).value !== "0"
      );
    }

    if (transform instanceof TranslateTransform) {
      return Dim.fromCss(transform.Z).value !== "0";
    }

    if (transform instanceof ScaleTransform) {
      return Dim.fromCss(transform.Z).value !== "1";
    }

    return false;
  });
};

const ORIGIN_KEYWORDS = ["center", "left", "right", "top", "bottom"];

const convertOriginKeyword = (value: string, dir: "left" | "top") => {
  if (!ORIGIN_KEYWORDS.includes(value)) {
    return value;
  }

  if (
    value === "center" ||
    (dir === "left" && ["top", "bottom"].includes(value)) ||
    (dir === "top" && ["left", "right"].includes(value))
  ) {
    return "50%";
  }

  return dir === value ? "0%" : "100%";
};

/**
 * Parses transform-origin value
 *
 * Handles both keywords (center, left, right, top, bottom) and length values
 *
 * @param origin CSS transform-origin value (e.g., "center center", "50% 50%")
 * @returns Object with left and top values
 */
export const parseOrigin = (origin: string | undefined) => {
  if (!origin) {
    return {
      left: undefined,
      top: undefined,
    };
  }
  const m = origin.split(" ");
  if (m.length === 1) {
    return {
      left: convertOriginKeyword(m[0], "left"),
      top: convertOriginKeyword(m[0], "top"),
    };
  }
  return {
    left: convertOriginKeyword(m[0], "left"),
    top: convertOriginKeyword(m[1], "top"),
  };
};
