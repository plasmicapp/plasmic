import { ensureKnownStyleTokenRef, Site, StyleToken } from "../../classes";
import { unreachable } from "../../common";
import { removeFromArray } from "../../commons/collections";
import { mkTokenRef, replaceAllTokenRefs } from "../../commons/StyleToken";
import { extractTokenUsages } from "../../styles";

export function fixDuplicatedRegisteredTokens(mergedSite: Site) {
  const tokensByRegKey: Record<string, StyleToken[]> = {};
  mergedSite.styleTokens.forEach((t) => {
    if (t.regKey) {
      const tokensList = tokensByRegKey[t.regKey] ?? [];
      tokensList.push(t);
      tokensByRegKey[t.regKey] = tokensList;
    }
  });
  Object.values(tokensByRegKey).forEach((tokens) => {
    const toToken = tokens[0];
    tokens.slice(1).forEach((duplicatedToken) => {
      replaceToken(mergedSite, duplicatedToken, toToken);
      removeFromArray(mergedSite.styleTokens, duplicatedToken);
    });
  });
}

function replaceToken(site: Site, fromToken: StyleToken, toToken: StyleToken) {
  const usages = extractTokenUsages(site, fromToken)[0];
  for (const usage of usages) {
    if (usage.type === "rule") {
      usage.rs.values[usage.prop] = replaceAllTokenRefs(
        usage.value,
        (tokenId: string) =>
          tokenId === fromToken.uuid ? mkTokenRef(toToken) : undefined
      );
    } else if (usage.type === "token") {
      usage.token.value = replaceAllTokenRefs(
        usage.token.value,
        (tokenId: string) =>
          tokenId === fromToken.uuid ? mkTokenRef(toToken) : undefined
      );
    } else if (usage.type === "variantedValue") {
      usage.variantedValue.value = replaceAllTokenRefs(
        usage.variantedValue.value,
        (tokenId: string) =>
          tokenId === fromToken.uuid ? mkTokenRef(toToken) : undefined
      );
    } else if (usage.type === "prop") {
      ensureKnownStyleTokenRef(usage.arg.expr).token = toToken;
    } else {
      unreachable(usage);
    }
  }
}
