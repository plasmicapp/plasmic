import { remove } from "@/wab/shared/common";
import { changeTokenUsage, extractTokenUsages } from "@/wab/shared/core/styles";
import { Site, StyleToken } from "@/wab/shared/model/classes";

/**
 * Delete a local style token. Inlines the token's value at every usage
 * (CSS rules, token-to-token refs, overrides, varianted values, props,
 * fallbacks) before removing it, so no dangling refs are left.
 */
export function deleteStyleToken(opts: {
  site: Site;
  token: StyleToken;
}): void {
  const { site, token } = opts;
  const [usages] = extractTokenUsages(site, token);
  for (const usage of usages) {
    changeTokenUsage(site, token, usage, "inline");
  }
  remove(site.styleTokens, token);
}
