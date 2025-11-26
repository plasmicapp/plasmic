import { Value, generate, parse, walk } from "css-tree";

type AspectRatioResult = { aspectRatio: string } | {};

/**
 * Parses and validates a CSS aspect-ratio value.
 * Returns the normalized value if valid, empty object if invalid.
 *
 * According to the CSS spec (https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/aspect-ratio#formal_syntax),
 * aspect-ratio = auto || <ratio>
 * <ratio> = <number [0,∞]> [ / <number [0,∞]> ]?
 *
 * @param value - The CSS aspect-ratio string value to parse
 * @returns { aspectRatio: string } if valid, {} if invalid
 */
export function parseAspectRatio(value: string): AspectRatioResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return {};
  }

  if (trimmed === "auto") {
    return { aspectRatio: "auto" };
  }

  let valueNode;
  try {
    valueNode = parse(trimmed, { context: "value" });
  } catch (e) {
    return {};
  }

  const components: Array<
    { type: "number"; value: string } | { type: "operator" }
  > = [];
  let parseError = false;

  walk(valueNode, (node) => {
    switch (node.type) {
      case "Number": {
        const num = parseFloat((node as any).value);
        if (num <= 0) {
          parseError = true;
          return walk.break;
        }
        components.push({ type: "number", value: (node as any).value });
        return walk.skip;
      }

      case "Operator": {
        const operator = (node as any).value;
        if (operator === "/") {
          components.push({ type: "operator" });
          return walk.skip;
        }
        parseError = true;
        return walk.break;
      }

      case "WhiteSpace":
      case "Value":
        return;

      default:
        parseError = true;
        return walk.break;
    }
  });

  if (parseError) {
    return {};
  }

  // Valid patterns: "number" or "number/number"
  if (components.length === 1 && components[0].type === "number") {
    return { aspectRatio: components[0].value };
  }

  if (
    components.length === 3 &&
    components[0].type === "number" &&
    components[1].type === "operator" &&
    components[2].type === "number"
  ) {
    // Normalize to "width/height" format (no spaces)
    return { aspectRatio: `${components[0].value}/${components[2].value}` };
  }

  return {};
}

/**
 * Parses aspect-ratio from a CSS AST Value node.
 * Used by HTML parser to normalize aspect-ratio values during import.
 *
 * @param valueNode - The CSS AST node representing an aspect-ratio value
 * @returns { aspectRatio: string } if valid, {} if invalid
 */
export function parseAspectRatioFromValueNode(
  valueNode: Value
): AspectRatioResult {
  const value = generate(valueNode);
  return parseAspectRatio(value);
}
