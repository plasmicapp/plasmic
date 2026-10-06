import { tokenTypes, tokenize } from "css-tree";

const blockOpeners = new Set([
  tokenTypes.Function,
  tokenTypes.LeftParenthesis,
  tokenTypes.LeftSquareBracket,
  tokenTypes.LeftCurlyBracket,
]);
const blockClosers = new Set([
  tokenTypes.RightParenthesis,
  tokenTypes.RightSquareBracket,
  tokenTypes.RightCurlyBracket,
]);

/**
 * Joins css values into a single string to store into RuleSet.values.
 * This is different from, say, showCssValues() because the output string
 * is not necessarily valid css!  For some props, the values are joined
 * in special ways.
 */
export function joinCssValues(prop: string | undefined, vals: string[]) {
  if (isSpaceDelimitedProp(prop)) {
    return vals.join(" ");
  } else {
    return vals.join(", ");
  }
}

/**
 * Splits a css value stored in RuleSet.values into its items. Commas
 * separate the items, or whitespace does for filter and backdrop-filter.
 * A separator inside brackets does not split, so "rgb(0, 0, 0), rgb(0, 0, 0)" has
 * two items.
 *
 * Each item is a slice of the original text. It keeps its exact text but
 * not the spaces around it, so "  Open  Sans , serif" gives ["Open  Sans", "serif"].
 */
export function splitCssValue(
  prop: string | undefined,
  value: string,
): string[] {
  const separator = isSpaceDelimitedProp(prop)
    ? tokenTypes.WhiteSpace
    : tokenTypes.Comma;

  const parts: string[] = [];
  let depth = 0;
  let partStart: number | undefined;
  let partEnd = 0;

  // Ends the current item.
  const flush = () => {
    if (partStart !== undefined) {
      parts.push(value.slice(partStart, partEnd));
    }
    partStart = undefined;
  };

  tokenize(value, (type, start, end) => {
    if (depth === 0 && type === separator) {
      flush();
      return;
    }

    // Whitespace at top most level never moves partStart or partEnd, so an item
    // drops the spaces around it and keeps the ones inside it.
    if (depth === 0 && type === tokenTypes.WhiteSpace) {
      return;
    }

    partStart ??= start;
    partEnd = end;
    if (blockOpeners.has(type)) {
      depth += 1;
    } else if (blockClosers.has(type)) {
      // A stray `)` can appear in free text such as custom font name. Keeping
      // depth at 0 lets `a), b` still split into ["a)", "b"].
      depth = Math.max(0, depth - 1);
    }
  });
  flush();
  return parts;
}

function isSpaceDelimitedProp(prop: string | undefined) {
  return prop === "filter" || prop === "backdrop-filter";
}
