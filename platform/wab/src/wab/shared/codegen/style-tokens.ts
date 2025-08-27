import {
  extractAllReferencedTokenIds,
  tryParseTokenRef,
} from "@/wab/commons/StyleToken";
import {
  ReadonlyIRuleSetHelpersX,
  RuleSetHelpers,
  readonlyRSH,
} from "@/wab/shared/RuleSetHelpers";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { VariantCombo } from "@/wab/shared/Variants";
import { ensure, withoutNils, xAddAll } from "@/wab/shared/common";
import {
  makeTokenValueResolver,
  siteFinalStyleTokens,
  siteFinalStyleTokensAllDepsDict,
} from "@/wab/shared/core/site-style-tokens";
import { expandRuleSets } from "@/wab/shared/core/styles";
import { FinalToken, toFinalToken } from "@/wab/shared/core/tokens";
import { flattenTpls } from "@/wab/shared/core/tpls";
import {
  Component,
  Mixin,
  Site,
  StyleToken,
  StyleTokenOverride,
  TplNode,
  Variant,
  isKnownStyleExpr,
  isKnownStyleTokenRef,
} from "@/wab/shared/model/classes";
import L from "lodash";

export interface TheoToken {
  name: string;
  type: string;
  value: string;
  category: string;
  meta: TheoTokenMeta;
}

export interface TheoTokenMeta {
  id: string;
  projectId?: string;
  pkgId?: string;
}

export interface TheoTokensOutput {
  props: TheoToken[];
  global: {
    meta: {
      source: "plasmic.app";
    };
  };
}

export function exportStyleTokens(
  projectId: string,
  site: Site
): TheoTokensOutput {
  const tokens = siteFinalStyleTokens(site);
  const resolver = makeTokenValueResolver(site);
  return {
    props: tokens.map((token) =>
      serializeStyleToken(token, { projectId }, resolver)
    ),
    global: {
      meta: {
        source: "plasmic.app",
      },
    },
  };
}

function serializeStyleToken(
  token: FinalToken<StyleToken>,
  meta: { projectId?: string; pkgId?: string },
  resolver: (token: FinalToken<StyleToken>) => string
): TheoToken {
  return {
    name: token.name,
    type: token.type.toLowerCase(),
    value: resolver(token),
    category: token.type.toLowerCase(),
    meta: {
      ...meta,
      id: token.uuid,
    },
  };
}

export function extractUsedGlobalVariantCombosForTokens(
  site: Site,
  tokens: Set<StyleToken>
) {
  const usedGlobalVariantCombos: Set<VariantCombo> = new Set();
  xAddAll(
    usedGlobalVariantCombos,
    L.uniqBy(
      Array.from(tokens)
        .flatMap((t) => t.variantedValues)
        .map((v) => new VariantedStylesHelper(site, v.variants)),
      (el) => el.key()
    ).map((vsh) => ensure(vsh.globalVariants(), "must be global variants"))
  );
  return usedGlobalVariantCombos;
}

export function extractUsedGlobalVariantsForTokens(
  tokens: Set<StyleToken>,
  site: Site
) {
  const usedGlobalVariants: Set<Variant> = new Set();
  for (const token of tokens) {
    const finalToken = toFinalToken(token, site);
    xAddAll(
      usedGlobalVariants,
      finalToken.base.variantedValues.flatMap((v) => v.variants)
    );
    if (finalToken.override) {
      xAddAll(
        usedGlobalVariants,
        finalToken.override.variantedValues.flatMap((v) => v.variants)
      );
    }
  }
  return usedGlobalVariants;
}

export function extractUsedTokensForComponents(
  site: Site,
  components: Component[],
  opts: {
    expandMixins: boolean;
    derefTokens: boolean;
  }
) {
  const usedTokens = new Set<StyleToken>();
  for (const component of components) {
    for (const tpl of flattenTpls(component.tplTree)) {
      collectUsedTokensForTpl(usedTokens, tpl, site, opts);
    }
  }
  return usedTokens;
}

export function collectUsedTokensForTpl(
  collector: Set<StyleToken>,
  tpl: TplNode,
  site: Site,
  opts: {
    expandMixins: boolean;
    derefTokens: boolean;
  }
) {
  for (const vs of tpl.vsettings) {
    const rulesets = opts.expandMixins ? expandRuleSets([vs.rs]) : [vs.rs];
    for (const rs of rulesets) {
      collectUsedTokensForExp(collector, readonlyRSH(rs, tpl), site, opts);
    }
    for (const arg of vs.args) {
      if (isKnownStyleTokenRef(arg.expr)) {
        collector.add(arg.expr.token);
      } else if (isKnownStyleExpr(arg.expr)) {
        for (const sty of arg.expr.styles) {
          collectUsedTokensForExp(
            collector,
            new RuleSetHelpers(sty.rs, "div"),
            site,
            opts
          );
        }
      }
    }
  }
}

function collectUsedTokensForExp(
  collector: Set<StyleToken>,
  exp: ReadonlyIRuleSetHelpersX,
  site: Site,
  opts: { derefTokens: boolean }
) {
  const allTokensDict = siteFinalStyleTokensAllDepsDict(site);
  for (const prop of exp.props()) {
    const val = exp.getRaw(prop);
    if (val) {
      const refTokenIds = extractAllReferencedTokenIds(val);
      const refTokens = withoutNils(refTokenIds.map((x) => allTokensDict[x]));
      xAddAll(
        collector,
        refTokens.map((refToken) => refToken.base)
      );
      if (opts.derefTokens) {
        for (const token of refTokens) {
          collectUsedTokensForTokenValue(collector, token.value, site, {
            derefTokens: true,
          });
        }
      }
    }
  }
}

function collectUsedTokensForTokenValue(
  collector: Set<StyleToken>,
  tokenValue: string,
  site: Site,
  opts: { derefTokens: boolean }
) {
  const allTokensDict = siteFinalStyleTokensAllDepsDict(site);
  let sub = tryParseTokenRef(tokenValue, allTokensDict);
  while (sub) {
    collector.add(sub.base);
    if (opts.derefTokens) {
      sub = tryParseTokenRef(sub.value, allTokensDict);
    } else {
      break;
    }
  }
}

export function extractUsedTokensForTokens(
  tokens: StyleToken[],
  site: Site,
  opts: { derefTokens: boolean }
) {
  const used = new Set<StyleToken>();
  for (const token of tokens) {
    collectUsedTokensForTokenValue(used, token.value, site, opts);
    for (const variantedValue of token.variantedValues) {
      collectUsedTokensForTokenValue(used, variantedValue.value, site, opts);
    }
  }
  return used;
}

export function extractUsedTokensForTokenOverrides(
  overrides: StyleTokenOverride[],
  site: Site,
  opts: { derefTokens: boolean }
) {
  const used = new Set<StyleToken>();
  for (const override of overrides) {
    if (override.value) {
      collectUsedTokensForTokenValue(used, override.value, site, opts);
    }
    for (const variantedValue of override.variantedValues) {
      collectUsedTokensForTokenValue(used, variantedValue.value, site, opts);
    }
  }
  return used;
}

export function extractUsedTokensForMixins(
  mixins: Mixin[],
  site: Site,
  opts: { derefTokens: boolean }
) {
  const usedTokens = new Set<StyleToken>();
  for (const mixin of mixins) {
    const exp = new RuleSetHelpers(mixin.rs, "div");
    collectUsedTokensForExp(usedTokens, exp, site, opts);
  }
  return usedTokens;
}
