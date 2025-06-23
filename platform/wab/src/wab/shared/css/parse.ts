import * as cssPegParser from "@/wab/gen/cssPegParser";

/**
 * Joins css values into a single string to store into RuleSet.values.
 * This is different from, say, showCssValues() because the output string
 * is not necessarily valid css!  For some props, the values are joined
 * in special ways.
 */
export function joinCssValues(prop: string | undefined, vals: string[]) {
  if (prop === "transform") {
    // transforms are usually space-separated, but we group
    // transformX/Y/Z together, rotateX/Y/Z together, etc, so if we
    // see `transformX() transformY() rotateX()` that's actually two
    // transforms! We're doing the "easy" thing by just joining the
    // values together with a special sentinel $$$, so the above would
    // look like `transformX() transformY()$$$rotateX()`.
    return vals.join("$$$");
  } else if (isSpaceDelimitedProp(prop)) {
    return vals.join(" ");
  } else {
    return vals.join(", ");
  }
}

/**
 * Splits a css value stored in RuleSet.values into an array of values.
 */
export function splitCssValue(prop: string | undefined, val: string): string[] {
  if (prop === "transform") {
    return val.split("$$$");
  } else if (isSpaceDelimitedProp(prop)) {
    return cssPegParser.parse(val, { startRule: "spaceSepValues" });
  } else {
    return cssPegParser.parse(val, { startRule: "commaSepValues" });
  }
}

function isSpaceDelimitedProp(prop: string | undefined) {
  return prop === "filter" || prop === "backdrop-filter";
}
