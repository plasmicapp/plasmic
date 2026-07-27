import { parse as cssParse, walk } from "css-tree";
import validator from "validator";

/**
 * Returns true if the url is absolute
 */
export function isValidUrl(url: string): boolean {
  return validator.isURL(url);
}

/**
 * Returns true if any url() token in the CSS value is not a valid absolute url.
 */
export function hasInvalidUrl(value: string): boolean {
  const valueNode = cssParse(value, { context: "value" });
  let invalid = false;
  walk(valueNode, (node) => {
    if (node.type === "Url" && !isValidUrl(node.value.trim())) {
      invalid = true;
    }
  });
  return invalid;
}
