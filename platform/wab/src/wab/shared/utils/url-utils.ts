import { extractParamsFromPagePath } from "@/wab/components";

/**
 * Takes in a url template and params, and substitutes in the param values
 * to make a real url
 */
export function substituteUrlParams(
  template: string,
  params: Record<string, string>
) {
  let path = template;
  for (const [key, value] of Object.entries(params)) {
    if (path.includes(`[[${key}]]`)) {
      // Optional catchall params can be empty
      path = substitutePathFragment(path, `[[${key}]]`, value || "");
    } else if (path.includes(`[${key}]`)) {
      // if value is empty string, keep the placeholder so the path is still valid
      if (value) {
        if (key.startsWith("...")) {
          // For catchall, value is already a valid url fragment
          path = substitutePathFragment(path, `[${key}]`, value);
        } else {
          path = path.replace(`[${key}]`, encodeURIComponent(value));
        }
      }
    }
  }
  // Replace optional catchall that still exist with ""
  const remainingParams = extractParamsFromPagePath(path);
  for (const param of remainingParams) {
    if (param.startsWith("...") && path.includes(`[[${param}]]`)) {
      path = path.replace(`[[${param}]]`, "");
    }
  }
  return path;
}

function substitutePathFragment(
  template: string,
  marker: string,
  value: string
) {
  // Remove starting and ending `/` from value
  value = value.replace(/^\/|\/$/g, "");
  return template.replace(marker, value);
}
