import { extractDimensionFromNode } from "@/wab/shared/css/css-tree-utils";
import {
  DimCssFunction,
  LengthOrPercentage,
  UnitlessNumber,
  isLengthOrPercentage,
  isUnitlessNumber,
} from "@/wab/shared/css/types";
import { Value, generate, walk } from "css-tree";

type FlexShorthandResult =
  | {
      flexGrow: string;
      flexShrink: string;
      flexBasis: string;
    }
  | {};

/**
 * Parses a CSS `flex` shorthand value into its individual components:
 * - flex-grow
 * - flex-shrink
 * - flex-basis
 *
 * According to the CSS spec (https://developer.mozilla.org/en-US/docs/Web/CSS/flex),
 * flex = none | [ <'flex-grow'> <'flex-shrink'>? || <'flex-basis'> ]
 *
 * @param valueNode - The CSS AST node representing a flex shorthand value
 * @returns An object with all three flex properties, or an empty object
 */
export function parseFlexShorthand(valueNode: Value): FlexShorthandResult {
  const value = generate(valueNode);

  if (value === "none") {
    return {
      flexGrow: "0",
      flexShrink: "0",
      flexBasis: "auto",
    };
  }

  if (value === "auto") {
    return {
      flexGrow: "1",
      flexShrink: "1",
      flexBasis: "auto",
    };
  }

  if (value === "initial") {
    return {
      flexGrow: "0",
      flexShrink: "1",
      flexBasis: "auto",
    };
  }

  type FlexComponent =
    | UnitlessNumber
    | LengthOrPercentage
    | DimCssFunction
    | "auto";
  const components: FlexComponent[] = [];
  let parseError = false;

  walk(valueNode, (node) => {
    switch (node.type) {
      case "Number": {
        const numValue = generate(node);
        components.push(numValue as UnitlessNumber);
        return walk.skip;
      }
      case "Identifier": {
        const identifier = generate(node);
        if (identifier === "auto") {
          components.push("auto");
          return walk.skip;
        }
        parseError = true;
        return walk.break;
      }
      case "Dimension":
      case "Percentage":
      case "Function": {
        const dimension = extractDimensionFromNode(node);
        if (dimension) {
          const dimValue = dimension.showCss();
          if (isLengthOrPercentage(dimValue)) {
            components.push(dimValue);
          } else {
            components.push(dimValue as DimCssFunction);
          }
        } else {
          parseError = true;
          return walk.break;
        }
        return walk.skip;
      }
      case "WhiteSpace":
      case "Value":
        // Structural nodes - ignore and continue walking
        return;
      default:
        // Invalid node type for flex value - stop parsing
        parseError = true;
        return walk.break;
    }
  });

  if (parseError) {
    return {};
  }

  // Interpret the components based on their count and types
  switch (components.length) {
    case 1: {
      const first = components[0];
      if (isUnitlessNumber(first)) {
        // Single number: flex-grow
        return {
          flexGrow: first,
          flexShrink: "1",
          flexBasis: "0",
        };
      }
      return {
        flexGrow: "1",
        flexShrink: "1",
        flexBasis: first,
      };
    }
    case 2: {
      const first = components[0];
      const second = components[1];

      if (isUnitlessNumber(first) && isUnitlessNumber(second)) {
        // Two numbers: flex-grow flex-shrink
        return {
          flexGrow: first,
          flexShrink: second,
          flexBasis: "0",
        };
      } else if (isUnitlessNumber(first) && !isUnitlessNumber(second)) {
        // Number and dimension: flex-grow flex-basis
        return {
          flexGrow: first,
          flexShrink: "1",
          flexBasis: second,
        };
      }
      break;
    }
    case 3: {
      const first = components[0];
      const second = components[1];
      const third = components[2];

      if (
        isUnitlessNumber(first) &&
        isUnitlessNumber(second) &&
        (!isUnitlessNumber(third) || third === "0")
      ) {
        // Three values: flex-grow flex-shrink flex-basis
        // Third value can be a dimension or unitless 0
        return {
          flexGrow: first,
          flexShrink: second,
          flexBasis: third,
        };
      }
      break;
    }
  }
  return {};
}
