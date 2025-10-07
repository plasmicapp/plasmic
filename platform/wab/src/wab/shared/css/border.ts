import { parseShorthandProperties } from "@/wab/shared/css";
import {
  extractColorFromNode,
  extractDimensionFromNode,
  isDimensionNode,
} from "@/wab/shared/css/css-tree-utils";
import { CssNode, Value, generate, parse, walk } from "css-tree";

type BorderProps =
  | "border"
  | "borderTop"
  | "borderBottom"
  | "borderRight"
  | "borderLeft";

export function isBorderProp(key: string): key is BorderProps {
  return /^border(?:Top|Bottom|Right|Left)?$/.test(key);
}

export function parseBorderShorthand(
  property: BorderProps,
  valueNode: Value
): {
  borderTopStyle?: string;
  borderBottomStyle?: string;
  borderRightStyle?: string;
  borderLeftStyle?: string;
  borderTopWidth?: string;
  borderBottomWidth?: string;
  borderRightWidth?: string;
  borderLeftWidth?: string;
  borderTopColor?: string;
  borderBottomColor?: string;
  borderRightColor?: string;
  borderLeftColor?: string;
} {
  const { style, width, color } = parseBorderValue(valueNode);

  if (property === "border") {
    return {
      ...(style
        ? (parseShorthandProperties("borderStyle", style) as {
            borderTopStyle: string;
            borderRightStyle: string;
            borderBottomStyle: string;
            borderLeftStyle: string;
          })
        : {}),

      ...(width
        ? (parseShorthandProperties("borderWidth", width) as {
            borderTopWidth: string;
            borderRightWidth: string;
            borderBottomWidth: string;
            borderLeftWidth: string;
          })
        : {}),

      ...(color
        ? (parseShorthandProperties("borderColor", color) as {
            borderTopColor: string;
            borderRightColor: string;
            borderBottomColor: string;
            borderLeftColor: string;
          })
        : {}),
    };
  }
  return {
    ...(style ? { [`${property}Style`]: generate(style) } : {}),
    ...(width ? { [`${property}Width`]: generate(width) } : {}),
    ...(color ? { [`${property}Color`]: generate(color) } : {}),
  };
}

/**
 * Extracts border style from a CSS AST node
 *
 * @param node The CSS AST node to extract border style from
 * @returns border style if found, null otherwise
 */
function extractBorderStyleFromNode(node: CssNode) {
  if (
    node.type === "Identifier" &&
    [
      "none",
      "hidden",
      "dotted",
      "dashed",
      "solid",
      "double",
      "groove",
      "ridge",
      "inset",
      "outset",
    ].includes(node.name)
  ) {
    return generate(node);
  }

  return null;
}

/**
 * Extracts border width from a CSS AST node
 *
 * This utility return border width:
 * - convert thin, medium, thick to px
 *
 * @param node The CSS AST node to extract border width from
 * @returns width if found, null otherwise
 */
function extractBorderWidthFromNode(node: CssNode) {
  if (isDimensionNode(node)) {
    return extractDimensionFromNode(node)?.showCss();
  }
  if (node.type === "Identifier") {
    const identifier = generate(node);
    switch (identifier) {
      case "thin": {
        return "1px";
      }
      case "medium": {
        return "3px";
      }
      case "thick": {
        return "5px";
      }
      default:
        break;
    }
  }

  return null;
}

/**
 * Parses a CSS `border` shorthand value node into its individual components:
 * - <line-width>
 * - <line-style>
 * - <color>
 *
 * According to the CSS spec (https://developer.mozilla.org/en-US/docs/Web/CSS/border#formal_syntax),
 * border = <line-width>  || <line-style>  || <color>
 * a border value can contain these three parts in any order, but only one of each type
 * is allowed.
 *
 * The walker traverses the AST nodes and extracts whichever parts are present.
 *
 * Special handling:
 * - If a `style` is defined but no `width` is provided, we assign a default width of "1.5px"
 *   to match browser behavior (since in plain CSS a border with style but no width is still rendered).
 *
 * @param valueNode - The CSS AST node representing a border shorthand value.
 * @returns An object with normalized `width`, `style`, and `color` strings.
 */
function parseBorderValue(valueNode: Value): {
  width: Value | null;
  style: Value | null;
  color: Value | null;
} {
  let color = "";
  let width = "";
  let style = "";
  walk(valueNode, (node) => {
    const maybeWidth = extractBorderWidthFromNode(node);
    if (maybeWidth) {
      width = maybeWidth;
      return walk.skip;
    }
    const maybeBorderStyle = extractBorderStyleFromNode(node);
    if (maybeBorderStyle) {
      style = maybeBorderStyle;
      return walk.skip;
    }
    const maybeColor = extractColorFromNode(node);
    if (maybeColor) {
      color = maybeColor;
      return walk.skip;
    }
    return;
  });

  if (!width && style && style !== "none") {
    // In Plasmic, we only render a border if both width and style are defined.
    // However, in plain HTML/CSS, a border is shown even if only the style is set —
    // the browser applies a default width.
    // To match that behavior, we add a default border width when a style is defined
    // but no width is specified.
    // The CSS spec defines the default as "initial", which most browsers default to 1.5px.
    width = "1.5px";
  }

  const widthValNode = parse(width, { context: "value" });
  const styleValNode = parse(style, { context: "value" });
  const colorValNode = parse(color, { context: "value" });
  return {
    width: width && widthValNode.type === "Value" ? widthValNode : null,
    style: style && styleValNode.type === "Value" ? styleValNode : null,
    color: color && colorValNode.type === "Value" ? colorValNode : null,
  };
}
