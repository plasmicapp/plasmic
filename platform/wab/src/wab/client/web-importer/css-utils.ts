import { CssNode, generate, List, parse } from "css-tree";

export function parseBoxShadows(shadows: string): string {
  if (!shadows.trim()) {
    return "";
  }

  const valueAst = parse(shadows, { context: "value" });
  if (valueAst.type !== "Value") {
    return "";
  }

  const shadowsList: Array<List<CssNode>> = [];
  let currentShadow = new List<CssNode>();

  /* valueAst represent a Value node for box-shadow property, it will have children node such as
   * Identifier -> inset, Dimension -> length, Function -> rgb(), var(), Hash -> hex color,
   * Most importantly, in case of multiple shadows which are separated using comma, we have an Operator node
   * that represents the comma.
   *
   * To collect individual box-shadow, we need to collect all the nodes between each Operator node. For example,
   * box-shadow: 2px, 4px, #fff, 0px, 3px, rgb(0,0,0,0.5) will be represented as
   * [ Dimension, Dimension, Hash, Operator, Dimension, Dimension, Function ] and converted to
   * [ [Dimension, Dimension, Hash], [Dimension, Dimension, Function] ]
   */
  valueAst.children.forEach((child) => {
    if (child.type === "Operator" && child.value === ",") {
      shadowsList.push(currentShadow);
      currentShadow = new List<CssNode>();
    } else {
      currentShadow.push(child);
    }
  });
  shadowsList.push(currentShadow);

  return shadowsList.map((shadow) => parseBoxShadow(shadow)).join(", ");
}

/**
 * Parse a single box-shadow AST nodes into the following format:
 *   "[inset] offsetX offsetY blurRadius spreadRadius color"
 */
function parseBoxShadow(shadowNodes: List<CssNode>) {
  let inset = false;
  let color: string | undefined = undefined;
  const dims: string[] = [];

  for (const node of shadowNodes) {
    switch (node.type) {
      case "Identifier":
        if (node.name.toLowerCase() === "inset") {
          inset = true;
        } else if (node.name.toLowerCase() === "currentcolor") {
          color = "currentcolor";
        }
        break;

      case "Function":
        if (!color && (node.name === "var" || node.name.startsWith("rgb"))) {
          color = generate(node);
        }
        break;

      case "Hash":
        if (!color) {
          color = `#${node.value}`;
        }
        break;

      case "Dimension":
        dims.push(generate(node));
        break;

      default:
        break;
    }
  }

  while (dims.length < 4) {
    dims.push("0px");
  }

  if (!color) {
    color = "currentcolor";
  }

  return [inset ? "inset" : "", dims[0], dims[1], dims[2], dims[3], color]
    .filter(Boolean)
    .join(" ");
}
