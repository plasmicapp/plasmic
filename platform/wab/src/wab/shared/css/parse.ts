import * as cssPegParser from "@/wab/gen/cssPegParser";

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
 * Splits a css value stored in RuleSet.values into an array of values.
 */
export function splitCssValue(prop: string | undefined, val: string): string[] {
  if (isSpaceDelimitedProp(prop)) {
    return cssPegParser.parse(val, { startRule: "spaceSepValues" });
  } else {
    return cssPegParser.parse(val, { startRule: "commaSepValues" });
  }
}

function isSpaceDelimitedProp(prop: string | undefined) {
  return prop === "filter" || prop === "backdrop-filter";
}
