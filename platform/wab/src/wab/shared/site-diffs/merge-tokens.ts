import { TplMgr } from "@/wab/shared/TplMgr";
import { Site, StyleToken } from "@/wab/shared/model/classes";

export function fixDuplicatedRegisteredTokens(mergedSite: Site) {
  const tokensByRegKey: Record<string, StyleToken[]> = {};
  mergedSite.styleTokens.forEach((t) => {
    if (t.regKey) {
      const tokensList = tokensByRegKey[t.regKey] ?? [];
      tokensList.push(t);
      tokensByRegKey[t.regKey] = tokensList;
    }
  });
  const tplMgr = new TplMgr({ site: mergedSite });
  const duplicatedTokens = new Set<StyleToken>();
  Object.values(tokensByRegKey).forEach((tokens) => {
    const toToken = tokens[0];
    tokens.slice(1).forEach((duplicatedToken) => {
      tplMgr.swapTokens(duplicatedToken, toToken);
      duplicatedTokens.add(duplicatedToken);
    });
  });
  if (duplicatedTokens.size > 0) {
    mergedSite.styleTokens = mergedSite.styleTokens.filter(
      (t) => !duplicatedTokens.has(t),
    );
  }
}
