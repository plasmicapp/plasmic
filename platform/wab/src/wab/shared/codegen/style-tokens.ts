import { ensure, withoutNils, xAddAll } from "@/wab/shared/common";
import {
  extractAllReferencedTokenIds,
  tryParseTokenRef,
} from "@/wab/commons/StyleToken";
import { makeTokenValueResolver } from "@/wab/shared/cached-selectors";
import {
  Component,
  isKnownStyleExpr,
  isKnownStyleTokenRef,
  Mixin,
  Site,
  StyleToken,
  TplNode,
  Variant,
} from "@/wab/shared/model/classes";
import {
  ReadonlyIRuleSetHelpersX,
  readonlyRSH,
  RuleSetHelpers,
} from "@/wab/shared/RuleSetHelpers";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { VariantCombo } from "@/wab/shared/Variants";
import { allStyleTokens, localStyleTokens } from "@/wab/shared/core/sites";
import { expandRuleSets } from "@/wab/shared/core/styles";
import { flattenTpls } from "@/wab/shared/core/tpls";
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
  const tokens = localStyleTokens(site);
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
  token: StyleToken,
  meta: { projectId?: string; pkgId?: string },
  resolver: (token: StyleToken) => string
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

export function extractUsedTokensForTheme(
  site: Site,
  allTokensDict: Record<string, StyleToken>,
  opts: { derefTokens: boolean }
) {
  const tokens = new Set<StyleToken>();
  if (site.activeTheme) {
    const theme = site.activeTheme;
    collectUsedTokensForExp(
      tokens,
      new RuleSetHelpers(theme.defaultStyle.rs, "div"),
      allTokensDict,
      opts
    );
    for (const sty of theme.styles) {
      collectUsedTokensForExp(
        tokens,
        new RuleSetHelpers(sty.style.rs, "div"),
        allTokensDict,
        opts
      );
      for (const variantedRs of sty.style.variantedRs) {
        collectUsedTokensForExp(
          tokens,
          new RuleSetHelpers(variantedRs.rs, "div"),
          allTokensDict,
          opts
        );
      }
    }
  }
  return tokens;
}

export function extractUsedGlobalVariantsForTheme(site: Site) {
  const variants = new Set<Variant>();
  if (site.activeTheme) {
    for (const sty of site.activeTheme.styles) {
      for (const vRs of sty.style.variantedRs) {
        for (const v of vRs.variants) {
          variants.add(v);
        }
      }
    }
  }
  return variants;
}

export function extractUsedGlobalVariantsForTokens(tokens: Set<StyleToken>) {
  const usedGlobalVariants: Set<Variant> = new Set();
  for (const token of tokens) {
    xAddAll(
      usedGlobalVariants,
      token.variantedValues.flatMap((v) => v.variants)
    );
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
  const allTokensDict = L.keyBy(
    allStyleTokens(site, { includeDeps: "all" }),
    (t) => t.uuid
  );
  const usedTokens = new Set<StyleToken>();
  for (const component of components) {
    for (const tpl of flattenTpls(component.tplTree)) {
      collectUsedTokensForTpl(usedTokens, tpl, allTokensDict, opts);
    }
  }
  return usedTokens;
}

export function collectUsedTokensForTpl(
  collector: Set<StyleToken>,
  tpl: TplNode,
  allTokensDict: Record<string, StyleToken>,
  opts: {
    expandMixins: boolean;
    derefTokens: boolean;
  }
) {
  for (const vs of tpl.vsettings) {
    const rulesets = opts.expandMixins ? expandRuleSets([vs.rs]) : [vs.rs];
    for (const rs of rulesets) {
      collectUsedTokensForExp(
        collector,
        readonlyRSH(rs, tpl),
        allTokensDict,
        opts
      );
    }
    for (const arg of vs.args) {
      if (isKnownStyleTokenRef(arg.expr)) {
        collector.add(arg.expr.token);
      } else if (isKnownStyleExpr(arg.expr)) {
        for (const sty of arg.expr.styles) {
          collectUsedTokensForExp(
            collector,
            new RuleSetHelpers(sty.rs, "div"),
            allTokensDict,
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
  allTokensDict: Record<string, StyleToken>,
  opts: { derefTokens: boolean }
) {
  for (const prop of exp.props()) {
    const val = exp.getRaw(prop);
    if (val) {
      const refTokenIds = extractAllReferencedTokenIds(val);
      const refTokens = withoutNils(refTokenIds.map((x) => allTokensDict[x]));
      xAddAll(collector, refTokens);
      if (opts.derefTokens) {
        for (const token of refTokens) {
          collectUsedTokensForToken(collector, token, allTokensDict, {
            derefTokens: true,
          });
        }
      }
    }
  }
}

function collectUsedTokensForToken(
  collector: Set<StyleToken>,
  token: StyleToken,
  allTokensDict: Record<string, StyleToken>,
  opts: { derefTokens: boolean }
) {
  let sub = tryParseTokenRef(token.value, allTokensDict);
  while (sub) {
    collector.add(sub);
    if (opts.derefTokens) {
      sub = tryParseTokenRef(sub.value, allTokensDict);
    } else {
      break;
    }
  }
}

export function extractUsedTokensForTokens(
  tokens: StyleToken[],
  allTokensDict: Record<string, StyleToken>,
  opts: { derefTokens: boolean }
) {
  const used = new Set<StyleToken>();
  for (const token of tokens) {
    collectUsedTokensForToken(used, token, allTokensDict, opts);
  }
  return used;
}

export function extractUsedTokensForMixins(
  mixins: Mixin[],
  allTokensDict: Record<string, StyleToken>,
  opts: { derefTokens: boolean }
) {
  const usedTokens = new Set<StyleToken>();
  for (const mixin of mixins) {
    const exp = new RuleSetHelpers(mixin.rs, "div");
    collectUsedTokensForExp(usedTokens, exp, allTokensDict, opts);
  }
  return usedTokens;
}
