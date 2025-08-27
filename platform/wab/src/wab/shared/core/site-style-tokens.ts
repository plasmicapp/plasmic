import {
  ResolvedToken,
  StyleTokenType,
  TokenValue,
  extractAllReferencedTokenIds,
  resolveToken,
  tryParseTokenRef,
} from "@/wab/commons/StyleToken";
import { DeepReadonly } from "@/wab/commons/types";
import { readonlyRSH } from "@/wab/shared/RuleSetHelpers";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { flattenComponent } from "@/wab/shared/cached-selectors";
import { ensure, withoutNils, xAddAll } from "@/wab/shared/common";
import {
  DependencyWalkScope,
  walkDependencyTree,
} from "@/wab/shared/core/project-deps";
import { expandRuleSets } from "@/wab/shared/core/styles";
import { FinalToken, toFinalToken } from "@/wab/shared/core/tokens";
import { isTplVariantable } from "@/wab/shared/core/tpls";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import {
  Component,
  RuleSet,
  Site,
  StyleToken,
  TplNode,
} from "@/wab/shared/model/classes";
import keyBy from "lodash/keyBy";

/** Token resolver that returns the value and token. */
export type TokenResolver = (
  token: FinalToken<StyleToken>,
  vsh?: VariantedStylesHelper
) => ResolvedToken;
export const makeTokenResolver = maybeComputedFn(
  function makeTokenValueResolver(site: Site): TokenResolver {
    const allTokens = siteFinalStyleTokensAllDeps(site);
    const map: Map<StyleToken, Map<string, ResolvedToken>> = new Map();

    allTokens.forEach((token) => {
      const tokenMap: Map<string, ResolvedToken> = new Map();
      tokenMap.set(
        new VariantedStylesHelper().key(),
        resolveToken(allTokens, token)
      );
      token.variantedValues?.forEach((v) => {
        const vsh = new VariantedStylesHelper(site, v.variants);
        tokenMap.set(vsh.key(), resolveToken(allTokens, token, vsh));
      });
      map.set(token.base, tokenMap);
    });

    return (
      token: FinalToken<StyleToken>,
      maybeVsh?: VariantedStylesHelper
    ): ResolvedToken => {
      const vsh = maybeVsh ?? new VariantedStylesHelper(site);
      const tokenMap = ensure(
        map.get(token.base),
        () => `Missing token ${token.name} (${token.uuid})`
      );
      if (!tokenMap.has(vsh.key())) {
        tokenMap.set(vsh.key(), resolveToken(allTokens, token, vsh));
      }
      return ensure(tokenMap.get(vsh.key()), () => `Missing vsh ${vsh.key()}`);
    };
  }
);

/** Token resolver that returns the value only. */
export type TokenValueResolver = (
  token: FinalToken<StyleToken>,
  vsh?: VariantedStylesHelper
) => TokenValue;
export const makeTokenValueResolver = (site: Site): TokenValueResolver => {
  const tokenResolver = makeTokenResolver(site);
  return (
    token: FinalToken<StyleToken>,
    maybeVsh?: VariantedStylesHelper
  ): TokenValue => {
    return tokenResolver(token, maybeVsh).value;
  };
};

export const makeTokenRefResolver = maybeComputedFn(
  function makeTokenRefResolver(site: Site) {
    const tokenResolver = makeTokenValueResolver(site);
    const allTokens = siteFinalStyleTokensAllDepsDict(site);
    return (maybeRef: string, vsh?: VariantedStylesHelper) => {
      const maybeToken = tryParseTokenRef(maybeRef, allTokens);
      if (maybeToken) {
        return tokenResolver(maybeToken, vsh);
      }
      return undefined;
    };
  }
);

/**
 * Style tokens for the given site, optionally including dependencies
 */
function styleTokens(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope } = {}
) {
  const allTokens = [...site.styleTokens];

  if (opts.includeDeps) {
    allTokens.push(
      ...walkDependencyTree(site, opts.includeDeps).flatMap(
        (d) => d.site.styleTokens
      )
    );
  }

  return allTokens;
}

export const siteStyleTokens = maybeComputedFn(
  (site: Site): ReadonlyArray<StyleToken> => styleTokens(site)
);

export const siteStyleTokensDirectDeps = maybeComputedFn(
  (site: Site): ReadonlyArray<StyleToken> =>
    styleTokens(site, { includeDeps: "direct" })
);

export const siteStyleTokensAllDeps = maybeComputedFn(
  (site: Site): ReadonlyArray<StyleToken> =>
    styleTokens(site, { includeDeps: "all" })
);

export const siteStyleTokensAllDepsDict = maybeComputedFn(
  (site: Site): Readonly<{ [uuid: string]: StyleToken }> =>
    keyBy(siteStyleTokensAllDeps(site), (t) => t.uuid)
);

export const siteFinalStyleTokens = maybeComputedFn(
  (site: Site): ReadonlyArray<FinalToken<StyleToken>> =>
    siteStyleTokens(site).map((token) => toFinalToken(token, site))
);

export const siteFinalStyleTokensDirectDeps = maybeComputedFn(
  (site: Site): ReadonlyArray<FinalToken<StyleToken>> =>
    siteStyleTokensDirectDeps(site).map((token) => toFinalToken(token, site))
);

export const siteFinalStyleTokensAllDeps = maybeComputedFn(
  (site: Site): ReadonlyArray<FinalToken<StyleToken>> =>
    siteStyleTokensAllDeps(site).map((token) => toFinalToken(token, site))
);

export const siteFinalStyleTokensAllDepsDict = maybeComputedFn(
  (site: Site): Readonly<{ [uuid: string]: FinalToken<StyleToken> }> =>
    keyBy(siteFinalStyleTokensAllDeps(site), (t) => t.uuid)
);

function cachedSiteFinalStyleTokens(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope }
) {
  if (opts.includeDeps === "all") {
    return siteFinalStyleTokensAllDeps(site);
  } else if (opts.includeDeps === "direct") {
    return siteFinalStyleTokensDirectDeps(site);
  } else {
    return siteFinalStyleTokens(site);
  }
}

export function siteFinalStyleTokensOfType(
  site: Site,
  tokenType: StyleTokenType,
  opts: { includeDeps?: DependencyWalkScope } = {}
): ReadonlyArray<FinalToken<StyleToken>> {
  return cachedSiteFinalStyleTokens(site, opts).filter(
    (t) => t.type === tokenType
  );
}

export function siteFinalColorTokens(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope } = {}
): ReadonlyArray<FinalToken<StyleToken>> {
  return siteFinalStyleTokensOfType(site, "Color", opts);
}

/**
 * Final style tokens for the given dependency, where overrides are from the current site
 */
export function finalStyleTokensForDep(
  site: Site,
  depSite: Site
): FinalToken<StyleToken>[] {
  return depSite.styleTokens.map((t) => toFinalToken(t, site));
}

/**
 * Style token overrides from the current site for the given dependency
 */
export function styleTokenOverridesForDep(site: Site, depSite: Site) {
  const depTokens = keyBy(depSite.styleTokens, (t) => t.uuid);
  return site.styleTokenOverrides.filter((o) => depTokens[o.token.uuid]);
}

export const componentToUsedTokens = maybeComputedFn(
  function componentsToUsedTokens(
    site: Site,
    component: Component
  ): ReadonlyArray<StyleToken> {
    const usedTokens = new Set<StyleToken>();
    for (const tpl of flattenComponent(component)) {
      if (isTplVariantable(tpl)) {
        xAddAll(usedTokens, tplToUsedTokens(site, tpl));
      }
    }
    return [...usedTokens.keys()];
  }
);

const tplToUsedTokens = maybeComputedFn(function tplToUsedTokens(
  site: Site,
  tpl: TplNode
): ReadonlyArray<StyleToken> {
  const collector = new Set<StyleToken>();
  for (const vs of tpl.vsettings) {
    const rulesets = expandRuleSets([vs.rs]);
    for (const rs of rulesets) {
      xAddAll(collector, usedTokensForExp(site, rs, tpl));
    }
  }
  return [...collector.keys()];
});

const usedTokensForExp = maybeComputedFn(function usedTokensForExp(
  site: Site,
  rs: DeepReadonly<RuleSet>,
  tpl: TplNode
): ReadonlyArray<StyleToken> {
  const exp = readonlyRSH(rs, tpl);
  const allTokensDict = siteFinalStyleTokensAllDepsDict(site);
  const collector = new Set<StyleToken>();
  for (const prop of exp.props()) {
    const val = exp.getRaw(prop);
    if (val) {
      const refTokenIds = extractAllReferencedTokenIds(val);
      const refTokens = withoutNils(refTokenIds.map((x) => allTokensDict[x]));
      xAddAll(
        collector,
        refTokens.map((t) => t.base)
      );
      for (const token of refTokens) {
        xAddAll(collector, usedTokensForToken(site, allTokensDict[token.uuid]));
      }
    }
  }
  return [...collector.keys()];
});

const usedTokensForToken = maybeComputedFn(function collectUsedTokensForToken(
  site: Site,
  token: FinalToken<StyleToken>
): ReadonlyArray<StyleToken> {
  const allTokensDict = siteFinalStyleTokensAllDepsDict(site);
  const collector = new Set<StyleToken>();
  let sub = tryParseTokenRef(token.value, allTokensDict);
  while (sub) {
    collector.add(sub.base);
    if (sub.value) {
      sub = tryParseTokenRef(sub.value, allTokensDict);
    } else {
      break;
    }
  }
  return [...collector.keys()];
});
