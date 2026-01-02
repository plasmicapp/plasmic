import { Dim } from "@/wab/shared/core/bg-styles";
import {
  CSS_NAMED_COLORS_IDENTIFIERS,
  isColorFunction,
} from "@/wab/shared/css/colors";
import {
  DIM_CSS_FUNCTIONS,
  LengthUnit,
  isDimCssFunction,
} from "@/wab/shared/css/types";
import {
  CssNode,
  Dimension,
  FunctionNode,
  NumberNode,
  Percentage,
  Raw,
  StringNode,
  Url,
  generate,
  parse,
  walk,
} from "css-tree";
/**
 * Splits a collection of CSS nodes by comma operators
 *
 * This utility function handles the common pattern of splitting a list of CssNodes
 * by comma separators. It's used throughout CSS parsing such as for:
 * - Gradient color stops: linear-gradient(red, blue, green)
 * - Box shadows: box-shadow: 2px 4px red, 4px 6px blue
 * - Background layers: background: url(a.jpg), linear-gradient(red, blue)
 * - Transform functions: transform: rotate(45deg), scale(2)
 *
 * Examples:
 * Consider a multiple box-shadow css value 2px 4px #fff, 0px 3px rgb(0,0,0,0.5)
 * To collect individual box-shadow, we need to collect all the nodes between each Operator node
 *
 * Input: [
 *  Dimension(2px), Dimension(4px), Hash(fff),
 *  Operator(,),
 *  Dimension(0px), Dimension(3px), Function(rgb)
 * ]
 * Output: [
 *  [Dimension(2px), Dimension(4px), Hash(fff)],
 *  [Dimension(0px), Dimension(3px), Function(rgb)]
 * ]
 *
 * For linear gradient color stops, such as for linear-gradient(45deg, red, yellow 45%, blue);
 *
 * Input:  [
 *  Dimension(45deg),
 *  Operator(,),
 *  Identifier(red),
 *  Operator(,),
 *  Identifier(yellow), Dimension(45%),
 *  Operator(,),
 *  Identifier(blue)
 * ]
 * Output: [
 *  [Dimension(45deg)],
 *  [Identifier(red)],
 *  [Identifier(yellow), Dimension(45%)],
 *  [Identifier(blue)]
 * ]
 *
 * @param children List of CSS AST nodes to split
 * @param operatorValue The operator value to split on (default: ",")
 * @returns Array of node groups, each representing one comma-separated unit
 */
export function splitNodesByOperator<T extends CssNode>(
  children: T[],
  operatorValue: string = ","
): T[][] {
  const groups: T[][] = [];
  let currentGroup: T[] = [];

  for (const child of children) {
    if (child.type === "Operator") {
      if (child.value === operatorValue) {
        // Found separator - save current group and start new one
        groups.push(currentGroup);
        currentGroup = [];
        continue;
      }
    }

    // Add non-separator nodes to current group
    currentGroup.push(child);
  }

  // Adding the last group (no trailing separator)
  groups.push(currentGroup);

  return groups;
}

/**
 * Extracts color information from a CSS AST node
 *
 * This utility handles all the common color formats:
 * - Hex colors: #ff0000, #abc
 * - Named colors: red, blue, transparent, currentcolor
 * - Color functions: rgb(255,0,0), hsl(120,50%,50%), lab(50% 20 -30)
 * - CSS variables: var(--my-color)
 *
 * @param node The CSS AST node to extract color from
 * @returns Color string if found, null otherwise
 */
export function extractColorFromNode(node: CssNode) {
  switch (node.type) {
    // Hash node represents hex colors like #ff0000, #abc
    case "Hash": {
      return generate(node);
    }

    // Function nodes represent rgb(), rgba(), hsl(), var(), etc.
    case "Function": {
      const funcNode = node;
      if (funcNode.name === "var" || isColorFunction(funcNode.name)) {
        return generate(funcNode);
      }
      break;
    }

    // Identifier nodes represent named colors like 'red', 'blue', 'transparent'
    case "Identifier": {
      const identifierNode = node;
      if (CSS_NAMED_COLORS_IDENTIFIERS.includes(identifierNode.name)) {
        return identifierNode.name;
      }
      break;
    }

    default:
      break;
  }

  return null;
}

/**
 * Extracts dimension information from a CSS AST node and convert it to Dim instance
 *
 * @param node The CSS AST node to extract dimension from
 * @returns Dim instance if found, null otherwise
 */
export function extractDimensionFromNode(
  node: Extract<CssNode, { type: "Dimension" | "Percentage" | "Number" }>
): Dim;
export function extractDimensionFromNode(node: CssNode): Dim | null;
export function extractDimensionFromNode(node: CssNode): Dim | null {
  switch (node.type) {
    // Dimension nodes represent values with units like 50px, 25em
    case "Dimension":
    case "Percentage":
    case "Number":
      return Dim.fromCss(generate(node));
    case "Function": {
      const funcValue = generate(node);
      if (validateDimCssFunction(funcValue).valid) {
        return Dim.fromCss(funcValue);
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Extracts url information from a CSS AST node of type Url | StringNode | Raw
 *
 * @param node The CSS AST node to extract color from
 * @returns Url string if found, null otherwise
 */
export function extractUrlFromNode(node: Url | StringNode | Raw) {
  switch (node.type) {
    case "Url":
    case "String":
    case "Raw":
      return node.value.trim();

    default:
      return null;
  }
}

/**
 * Returns the first occurrence of a truthy value returned from a findFn function.
 */
export function findAndMap<T>(
  nodes: CssNode[],
  findFn: (node: CssNode) => T | null | undefined
): T | null {
  for (const node of nodes) {
    const foundItem = findFn(node);
    if (foundItem) {
      return foundItem;
    }
  }
  return null;
}

/**
 * Returns the all occurrences of a truthy value returned from a findFn function.
 */
export function findAllAndMap<T>(
  nodes: CssNode[],
  findFn: (node: CssNode) => T | null | undefined
): T[] {
  const foundItems: T[] = [];
  for (const node of nodes) {
    const foundItem = findFn(node);
    if (foundItem) {
      foundItems.push(foundItem);
    }
  }
  return foundItems;
}

/**
 * Checks if a node represents a dimension value
 */
export function isDimensionNode(
  node: CssNode
): node is Dimension | Percentage | NumberNode | FunctionNode {
  if (
    node.type === "Dimension" ||
    node.type === "Percentage" ||
    node.type === "Number"
  ) {
    return true;
  }

  // Check for CSS dimension functions
  if (
    node.type === "Function" &&
    validateDimCssFunction(generate(node)).valid
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a node represents a variable function
 */
export function isVarFunctionNode(node: CssNode): node is FunctionNode {
  return node.type === "Function" && node.name === "var";
}

/**
 * Checks if a node represents a linear gradient function
 */
export function isLinearGradientFunction(node: CssNode): node is FunctionNode {
  return (
    node.type === "Function" &&
    (node.name === "linear-gradient" ||
      node.name === "repeating-linear-gradient")
  );
}

/**
 * Checks if a node represents a linear gradient function
 */
export function isRadialGradientFunction(node: CssNode): node is FunctionNode {
  return (
    node.type === "Function" &&
    (node.name === "radial-gradient" ||
      node.name === "repeating-radial-gradient")
  );
}

const DIM_CSS_IDENTIFIER_KEYWORDS = ["auto", "inherit", "initial", "unset"];

type DimCssFunctionValidationResult =
  | { valid: true }
  | { valid: false; error: string };

/**
 * Validates a CSS dimension function (calc, min, max, clamp) and returns detailed error information
 *
 * @param value - The CSS value to validate
 * @param allowedUnits - Optional array of allowed units (e.g., ['px', '%', 'em'])
 * @returns Validation result with error message if invalid
 */
export function validateDimCssFunction(
  value: string,
  allowedUnits?: readonly string[]
): DimCssFunctionValidationResult {
  const invalidFunctionError = `Not a valid CSS dimension function. Must be one of these: ${DIM_CSS_FUNCTIONS.join(
    ", "
  )}`;
  if (!isDimCssFunction(value)) {
    return {
      valid: false,
      error: invalidFunctionError,
    };
  }

  let ast: CssNode;
  try {
    // Parsing can fail if the input has incomplete characters or invalid format
    ast = parse(value, { context: "value" });
  } catch (e) {
    return {
      valid: false,
      error: e.message ?? "Invalid CSS syntax",
    };
  }

  let error: string | null = null;

  walk(ast, (node) => {
    switch (node.type) {
      case "Dimension":
      case "Percentage":
      case "Number": {
        const dim = extractDimensionFromNode(node);
        if (allowedUnits && dim.unit && !allowedUnits.includes(dim.unit)) {
          error = `The unit '${
            dim.unit
          }' isn't supported here. Please use one of: ${allowedUnits.join(
            ", "
          )}`;
          return walk.break;
        }
        return;
      }
      case "Identifier": {
        if (!DIM_CSS_IDENTIFIER_KEYWORDS.includes(node.name.toLowerCase())) {
          error = `'${
            node.name
          }' isn't a valid keyword here. Please use one of: ${DIM_CSS_IDENTIFIER_KEYWORDS.join(
            ", "
          )}`;
          return walk.break;
        }
        return;
      }
      case "Function": {
        const funcName = node.name.toLowerCase();

        // Allow var() function - skip validation of its children
        if (funcName === "var") {
          return walk.skip; // Don't walk into var() children
        }

        // Check if it's a valid dimension function
        if (!isDimCssFunction(generate(node))) {
          error = invalidFunctionError;
          return walk.break;
        }

        // Nested function is valid, continue walking its children
        return;
      }
      case "Value":
      case "Operator": {
        return;
      }
      default: {
        error = `This part of your CSS function isn't valid. Found unexpected '${node.type}'`;
        return walk.break;
      }
    }
  });

  if (error) {
    return { valid: false, error };
  }

  return { valid: true };
}

/**
 * Checks if a dimension value contains only allowed units.
 *
 * @param value The CSS dimension value to check
 * @param allowedUnits Array of allowed unit strings
 * @returns true if all units in the value are allowed, false otherwise
 */
export function checkAllowedUnits(
  value: string,
  allowedUnits: LengthUnit[]
): boolean {
  if (!value || value.trim().length === 0) {
    return true;
  }

  let ast: CssNode;
  try {
    ast = parse(value, { context: "value" });
  } catch (e) {
    return false;
  }

  let isValid = true;

  walk(ast, (node) => {
    if (
      node.type === "Dimension" ||
      node.type === "Percentage" ||
      node.type === "Number"
    ) {
      const dim = extractDimensionFromNode(node);
      if (!allowedUnits.includes(dim.unit as LengthUnit)) {
        isValid = false;
        return walk.break;
      }
    }
    return;
  });

  return isValid;
}
