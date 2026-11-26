import {
  ResolvedToken,
  StyleTokenType,
  StyleTokenValue,
  extractAllReferencedTokenIds,
  isTokenRef,
  resolveToken,
  tryParseTokenRef,
} from "@/wab/commons/StyleToken";
import { DeepReadonly } from "@/wab/commons/types";
import { readonlyRSH } from "@/wab/shared/RuleSetHelpers";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import type { VariantCombo } from "@/wab/shared/Variants";
import { flattenComponent } from "@/wab/shared/cached-selectors";
import {
  arrayEqIgnoreOrder,
  ensure,
  withoutNils,
  xAddAll,
} from "@/wab/shared/common";
import {
  DependencyWalkScope,
  walkDependencyTree,
} from "@/wab/shared/core/project-deps";
import { allGlobalVariants } from "@/wab/shared/core/sites";
import { expandRuleSets } from "@/wab/shared/core/styles";
import {
  FinalToken,
  MutableToken,
  OverrideableToken,
  mkToFinalToken,
} from "@/wab/shared/core/tokens";
import { isTplVariantable } from "@/wab/shared/core/tpls";
import { maybeComputedFn, siteSelector } from "@/wab/shared/mobx-util";
import {
  Component,
  RuleSet,
  Site,
  StyleToken,
  TplNode,
} from "@/wab/shared/model/classes";
import keyBy from "lodash/keyBy";
import memoize from "lodash/memoize";
import { computedFn } from "mobx-utils";
import { Result, err, ok } from "neverthrow";

/** Token resolver that returns the value and token. */
export type TokenResolver = (
  token: FinalToken<StyleToken>,
  vsh?: VariantedStylesHelper,
) => ResolvedToken;
export function makeTokenResolverForTokens(
  site: Site,
  allTokens: ReadonlyArray<FinalToken<StyleToken>>,
): TokenResolver {
  const map: Map<StyleToken, Map<string, ResolvedToken>> = new Map();

  allTokens.forEach((token) => {
    const tokenMap: Map<string, ResolvedToken> = new Map();
    tokenMap.set(
      new VariantedStylesHelper().key(),
      resolveToken(allTokens, token),
    );
    token.variantedValues?.forEach((v) => {
      const vsh = new VariantedStylesHelper(site, v.variants);
      tokenMap.set(vsh.key(), resolveToken(allTokens, token, vsh));
    });
    map.set(token.base, tokenMap);
  });

  return (
    token: FinalToken<StyleToken>,
    maybeVsh?: VariantedStylesHelper,
  ): ResolvedToken => {
    const vsh = maybeVsh ?? new VariantedStylesHelper(site);
    const tokenMap = ensure(
      map.get(token.base),
      () => `Missing token ${token.name} (${token.uuid})`,
    );
    if (!tokenMap.has(vsh.key())) {
      tokenMap.set(vsh.key(), resolveToken(allTokens, token, vsh));
    }
    return ensure(tokenMap.get(vsh.key()), () => `Missing vsh ${vsh.key()}`);
  };
}

export const makeTokenResolver = maybeComputedFn(function makeTokenResolver(
  site: Site,
): TokenResolver {
  return makeTokenResolverForTokens(site, siteFinalStyleTokensAllDeps(site));
});

/** Token resolver that returns the value only. */
export type TokenValueResolver = (
  token: FinalToken<StyleToken>,
  vsh?: VariantedStylesHelper,
) => StyleTokenValue;
function makeTokenValueResolverFromResolver(
  tokenResolver: TokenResolver,
): TokenValueResolver {
  return (
    token: FinalToken<StyleToken>,
    maybeVsh?: VariantedStylesHelper,
  ): StyleTokenValue => tokenResolver(token, maybeVsh).value;
}

export const makeTokenValueResolver = (site: Site): TokenValueResolver => {
  return makeTokenValueResolverFromResolver(makeTokenResolver(site));
};

export function makeTokenValueResolverForTokens(
  site: Site,
  allTokens: ReadonlyArray<FinalToken<StyleToken>>,
): TokenValueResolver {
  return makeTokenValueResolverFromResolver(
    makeTokenResolverForTokens(site, allTokens),
  );
}

/** Token resolver that takes a string token reference and returns the resolved value. */
export type TokenRefResolver = (
  maybeRef: string,
  vsh?: VariantedStylesHelper,
) => StyleTokenValue | undefined;

export function makeTokenRefResolverForTokens(
  site: Site,
  allTokens: ReadonlyArray<FinalToken<StyleToken>>,
  allTokensDict: Readonly<{ [uuid: string]: FinalToken<StyleToken> }> = keyBy(
    allTokens,
    (token) => token.uuid,
  ),
): TokenRefResolver {
  const tokenResolver = makeTokenValueResolverForTokens(site, allTokens);
  return (maybeRef: string, vsh?: VariantedStylesHelper) => {
    const maybeToken = tryParseTokenRef(maybeRef, allTokensDict);
    return maybeToken ? tokenResolver(maybeToken, vsh) : undefined;
  };
}

export const makeTokenRefResolver = maybeComputedFn(
  function makeTokenRefResolver(site: Site): TokenRefResolver {
    const allTokens = siteFinalStyleTokensAllDeps(site);
    return makeTokenRefResolverForTokens(site, allTokens);
  },
);

/**
 * Style tokens for the given site, optionally including dependencies
 */
function styleTokens(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope } = {},
) {
  const allTokens = [...site.styleTokens];

  if (opts.includeDeps) {
    allTokens.push(
      ...walkDependencyTree(site, opts.includeDeps).flatMap(
        (d) => d.site.styleTokens,
      ),
    );
  }

  return allTokens;
}

export const siteStyleTokens = maybeComputedFn(
  (site: Site): ReadonlyArray<StyleToken> => styleTokens(site),
);

export const siteStyleTokensDirectDeps = computedFn(
  (site: Site): ReadonlyArray<StyleToken> =>
    styleTokens(site, { includeDeps: "direct" }),
);

export const siteStyleTokensAllDeps = maybeComputedFn(
  (site: Site): ReadonlyArray<StyleToken> =>
    styleTokens(site, { includeDeps: "all" }),
);

export const siteStyleTokensAllDepsDict = maybeComputedFn(
  (site: Site): Readonly<{ [uuid: string]: StyleToken }> =>
    keyBy(siteStyleTokensAllDeps(site), (t) => t.uuid),
);

export const siteFinalStyleTokens = maybeComputedFn(
  (site: Site): ReadonlyArray<FinalToken<StyleToken>> =>
    siteStyleTokens(site).map(mkToFinalToken(site)),
);

export const siteFinalStyleTokensDirectDeps = maybeComputedFn(
  (site: Site): ReadonlyArray<FinalToken<StyleToken>> =>
    siteStyleTokensDirectDeps(site).map(mkToFinalToken(site)),
);

export const siteFinalStyleTokensAllDeps = maybeComputedFn(
  (site: Site): ReadonlyArray<FinalToken<StyleToken>> =>
    siteStyleTokensAllDeps(site).map(mkToFinalToken(site)),
);

export const siteFinalStyleTokensAllDepsDict = maybeComputedFn(
  (site: Site): Readonly<{ [uuid: string]: FinalToken<StyleToken> }> =>
    keyBy(siteFinalStyleTokensAllDeps(site), (t) => t.uuid),
);

function cachedSiteFinalStyleTokens(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope },
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
  opts: { includeDeps?: DependencyWalkScope } = {},
): ReadonlyArray<FinalToken<StyleToken>> {
  return cachedSiteFinalStyleTokens(site, opts).filter(
    (t) => t.type === tokenType,
  );
}

export function siteFinalColorTokens(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope } = {},
): ReadonlyArray<FinalToken<StyleToken>> {
  return siteFinalStyleTokensOfType(site, "Color", opts);
}

export type StyleTokenValueError =
  | { type: "invalid"; message: string }
  | { type: "cycle"; message: string; cycle: string[] };

export function validateStyleTokenValue(
  site: Site,
  type: StyleTokenType,
  value: string,
): Result<void, StyleTokenValueError> {
  // The value is emitted verbatim as `--token-x: <value>;`.
  if (/[;{}]/.test(value)) {
    return err({
      type: "invalid",
      message: `Value "${value}" must be a single CSS value.`,
    });
  }
  const refs = extractAllReferencedTokenIds(value);
  if (refs.length || isTokenRef(value)) {
    const tokens = keyBy(siteStyleTokensDirectDeps(site), (t) => t.uuid);
    const missingRef = refs.some((id) => !Object.hasOwn(tokens, id));
    if (missingRef || (isTokenRef(value) && tokens[refs[0]]?.type !== type)) {
      return err({
        type: "invalid",
        message: `Value "${value}" does not reference an existing ${type} token.`,
      });
    }
  }
  return ok(undefined);
}

function validateTokenAlias(
  site: Site,
  token: FinalToken<StyleToken>,
  value: string,
  variants: VariantCombo,
  active?: VariantedStylesHelper,
): Result<void, StyleTokenValueError> {
  if (!value.includes("--token-")) {
    return ok(undefined);
  }
  const tokens = siteFinalStyleTokensAllDepsDict(site);
  const contexts = [new VariantedStylesHelper(site, variants)];
  if (active) {
    contexts.push(active);
  }
  // A base alias is also used in each variant where this token inherits its value.
  if (!variants.length) {
    for (const variant of allGlobalVariants(site, {
      includeDeps: "direct",
    })) {
      contexts.push(new VariantedStylesHelper(site, [variant]));
    }
  }
  for (const context of contexts) {
    if (
      !variants.length &&
      context.getVariantedValueWithHighestPriority(token)
    ) {
      continue;
    }
    const cycle = maybeTokenRefCycle(token, value, tokens, context);
    if (cycle) {
      return err({
        type: "cycle",
        message: `Value "${value}" would create a cyclic token reference: ${cycle.join(" -> ")}.`,
        cycle,
      });
    }
  }
  return ok(undefined);
}

/** Check the alias that will take effect when an override is removed. */
export function removeStyleTokenOverride(
  site: Site,
  token: MutableToken<StyleToken> | OverrideableToken<StyleToken>,
  variants: VariantCombo,
): Result<void, StyleTokenValueError> {
  if (!variants.length) {
    if (
      !(token instanceof OverrideableToken) ||
      token.override?.value == null
    ) {
      return ok(undefined);
    }
    return validateTokenAlias(site, token, token.base.value, []).map(() => {
      token.removeValue();
    });
  }
  const editable = token instanceof MutableToken ? token.base : token.override;
  const removed = editable?.variantedValues.find((v) =>
    arrayEqIgnoreOrder(v.variants, variants),
  );
  if (!removed) {
    return ok(undefined);
  }
  const context = new VariantedStylesHelper(site, variants);
  const inherited = context
    .sortedActiveVariantedValue(token)
    .reverse()
    .find((v) => v !== removed);
  return validateTokenAlias(
    site,
    token,
    inherited?.value ?? token.value,
    variants,
  ).map(() => {
    token.removeVariantedValue(variants);
  });
}

/** Validates user input before writing the base value or a variant override. */
export function setStyleTokenValue(
  site: Site,
  token: MutableToken<StyleToken> | OverrideableToken<StyleToken>,
  value: string,
  variants: VariantCombo = [],
  vsh?: VariantedStylesHelper,
): Result<void, StyleTokenValueError> {
  const trimmed = value.trim();
  return validateStyleTokenValue(site, token.type, trimmed)
    .andThen(() => validateTokenAlias(site, token, trimmed, variants, vsh))
    .map(() =>
      variants.length > 0
        ? token.setVariantedValue(variants, trimmed)
        : token.setValue(trimmed),
    );
}

function referencedTokens(
  value: string,
  tokens: Readonly<Record<string, FinalToken<StyleToken>>>,
) {
  return withoutNils(
    extractAllReferencedTokenIds(value).map((id) =>
      Object.hasOwn(tokens, id) ? tokens[id] : undefined,
    ),
  );
}

function maybeTokenRefCycle(
  token: FinalToken<StyleToken>,
  value: string,
  tokens: Readonly<Record<string, FinalToken<StyleToken>>>,
  vsh: VariantedStylesHelper,
): string[] | undefined {
  const path = new Set([token.base]);
  const checked = new Set<StyleToken>();
  const stack = [{ token: token.base, refs: referencedTokens(value, tokens) }];
  while (stack.length) {
    const current = stack[stack.length - 1];
    const ref = current.refs.pop();
    if (!ref) {
      checked.add(current.token);
      path.delete(current.token);
      stack.pop();
      continue;
    }
    if (path.has(ref.base)) {
      return [...path, ref.base].map((t) => t.name);
    }
    if (!checked.has(ref.base)) {
      path.add(ref.base);
      stack.push({
        token: ref.base,
        refs: referencedTokens(vsh.getActiveTokenValue(ref), tokens),
      });
    }
  }
  return undefined;
}

/**
 * Final style tokens for the given dependency, where overrides are from the current site
 */
export function finalStyleTokensForDep(
  site: Site,
  depSite: Site,
  opts: { includeTransitiveDeps?: DependencyWalkScope } = {},
): FinalToken<StyleToken>[] {
  return styleTokens(depSite, { includeDeps: opts.includeTransitiveDeps }).map(
    mkToFinalToken(site),
  );
}

/**
 * Style token overrides from the current site for the given dependency
 */
export function styleTokenOverridesForDep(site: Site, depSite: Site) {
  const depTokens = keyBy(depSite.styleTokens, (t) => t.uuid);
  return site.styleTokenOverrides.filter((o) => depTokens[o.token.uuid]);
}

export const componentToUsedTokens = siteSelector(
  function componentsToUsedTokens(
    site: Site,
    component: Component,
  ): ReadonlyArray<StyleToken> {
    const usedTokens = new Set<StyleToken>();
    const getTokensDict = memoize(() => siteFinalStyleTokensAllDepsDict(site));
    for (const tpl of flattenComponent(component)) {
      if (isTplVariantable(tpl)) {
        xAddAll(usedTokens, tplToUsedTokens(site, tpl, getTokensDict));
      }
    }
    return [...usedTokens.keys()];
  },
);

// Not cached per tpl or rule set: componentToUsedTokens depends on the whole
// component anyway
function tplToUsedTokens(
  site: Site,
  tpl: TplNode,
  getTokensDict: () => ReturnType<typeof siteFinalStyleTokensAllDepsDict>,
): ReadonlyArray<StyleToken> {
  const collector = new Set<StyleToken>();
  for (const vs of tpl.vsettings) {
    const rulesets = expandRuleSets([vs.rs]);
    for (const rs of rulesets) {
      xAddAll(collector, usedTokensForExp(site, rs, tpl, getTokensDict));
    }
  }
  return [...collector.keys()];
}

function usedTokensForExp(
  site: Site,
  rs: DeepReadonly<RuleSet>,
  tpl: TplNode,
  getTokensDict: () => ReturnType<typeof siteFinalStyleTokensAllDepsDict>,
): ReadonlyArray<StyleToken> {
  const exp = readonlyRSH(rs, tpl);
  const collector = new Set<StyleToken>();
  for (const prop of exp.props()) {
    const val = exp.getRaw(prop);
    if (val?.includes("--token-")) {
      const allTokensDict = getTokensDict();
      const refTokens = referencedTokens(val, allTokensDict);
      xAddAll(
        collector,
        refTokens.map((t) => t.base),
      );
      for (const token of refTokens) {
        xAddAll(collector, usedTokensForToken(site, token, allTokensDict));
      }
    }
  }
  return [...collector.keys()];
}

// Lives only while observed by componentToUsedTokens, so that old token
// dictionaries are released after token membership changes.
const usedTokensForToken = maybeComputedFn(
  function collectUsedTokensForToken(
    _site: Site,
    token: FinalToken<StyleToken>,
    allTokensDict: ReturnType<typeof siteFinalStyleTokensAllDepsDict>,
  ): ReadonlyArray<StyleToken> {
    const used = new Set([token]);
    for (const current of used) {
      xAddAll(used, referencedTokens(current.value, allTokensDict));
    }
    return [...used].map((t) => t.base);
  },
  { keepAlive: false },
);
