import { isImageDataUrl } from "@/wab/shared/data-urls";
import { parse as cssParse, walk } from "css-tree";
import { uniq } from "lodash";
import validator from "validator";

/**
 * Returns true if the url is absolute
 */
export function isValidUrl(url: string): boolean {
  return validator.isURL(url);
}

/** Every url() token in the CSS value. Throws when the value does not parse. */
function cssUrls(value: string): string[] {
  const urls: string[] = [];
  walk(cssParse(value, { context: "value" }), (node) => {
    if (node.type === "Url") {
      urls.push(node.value.trim());
    }
  });
  return urls;
}

/**
 * Returns true if any url() token in the CSS value is neither a valid absolute url nor a valid image data url.
 */
export function hasInvalidUrl(value: string): boolean {
  return cssUrls(value).some((url) => !isValidUrl(url) && !isImageDataUrl(url));
}

export function extractImageDataUrls(value: string): string[] {
  try {
    return uniq(cssUrls(value).filter(isImageDataUrl));
  } catch {
    return [];
  }
}
