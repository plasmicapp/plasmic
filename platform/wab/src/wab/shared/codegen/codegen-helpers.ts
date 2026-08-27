import { tryParseTokenRef } from "@/wab/commons/StyleToken";
import { DeepMap, deepMapMemoized } from "@/wab/commons/deep-map";
import { readonlyRSH } from "@/wab/shared/RuleSetHelpers";
import {
  isTextArgNodeOfSlot,
  shouldWrapSlotContentInDataCtxReader,
} from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  VariantCombo,
  isBaseVariant,
  isMediaQueryVariantGroup,
  variantComboKey,
} from "@/wab/shared/Variants";
import { componentToReferenced } from "@/wab/shared/cached-selectors";
import { buildObjToDepMap } from "@/wab/shared/core/project-deps";
import {
  TokenRefResolver,
  TokenValueResolver,
  makeTokenResolverForTokens,
  siteFinalStyleTokensAllDeps,
} from "@/wab/shared/core/site-style-tokens";
import { allImageAssets, allMixins } from "@/wab/shared/core/sites";
import {
  CssVarResolver,
  createExpandedRuleSetMerger,
} from "@/wab/shared/core/styles";
import { flattenTpls } from "@/wab/shared/core/tpls";
import { getEffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import { makeLayoutAwareRuleSet } from "@/wab/shared/layoututils";
import {
  Component,
  Site,
  TplNode,
  VariantSetting,
} from "@/wab/shared/model/classes";
import { getComponentDefaultSize } from "@/wab/shared/sizingutils";
import {
  makeVariantComboSorter,
  sortedVariantSettings,
} from "@/wab/shared/variant-sort";
import keyBy from "lodash/keyBy";
import uniqBy from "lodash/uniqBy";

export class SiteGenHelper {
  private cache: Map<string, DeepMap<any>> = new Map();
  constructor(public site: Site, public isStudio: boolean) {}

  getComponentDefaultSize = deepMapMemoized(
    this.cache,
    (component: Component, activeVariants: VariantCombo) =>
      getComponentDefaultSize(component, activeVariants),
    {
      // CSS codegen resolves `default` instance sizes repeatedly.
      funcKey: "getComponentDefaultSize",
      argKeys: ([component, activeVariants]) => [
        component,
        variantComboKey(activeVariants),
      ],
    }
  );

  makeTokenResolver = deepMapMemoized(
    this.cache,
    () =>
      makeTokenResolverForTokens(this.site, this.allStyleTokensAndOverrides()),
    { funcKey: "makeTokenResolver" }
  );
  makeTokenValueResolver = deepMapMemoized(
    this.cache,
    () => {
      const resolveToken = this.makeTokenResolver();
      const resolver: TokenValueResolver = (token, vsh) =>
        resolveToken(token, vsh).value;
      return resolver;
    },
    { funcKey: "makeTokenValueResolver" }
  );
  makeTokenRefResolver = deepMapMemoized(
    this.cache,
    () => {
      const allTokens = this.allStyleTokensAndOverridesDict();
      const resolveTokenValue = this.makeTokenValueResolver();
      const resolver: TokenRefResolver = (maybeRef, vsh) => {
        const maybeToken = tryParseTokenRef(maybeRef, allTokens);
        return maybeToken ? resolveTokenValue(maybeToken, vsh) : undefined;
      };
      return resolver;
    },
    { funcKey: "makeTokenRefResolver" }
  );
  allStyleTokensAndOverrides = deepMapMemoized(
    this.cache,
    () => siteFinalStyleTokensAllDeps(this.site),
    { funcKey: "allStyleTokensAndOverrides" }
  );
  allStyleTokensAndOverridesDict = deepMapMemoized(
    this.cache,
    () => keyBy(this.allStyleTokensAndOverrides(), (t) => t.uuid),
    { funcKey: "allStyleTokensAndOverridesDict" }
  );
  contextGlobalVariantsWithVariantedTokens = deepMapMemoized(
    this.cache,
    () =>
      uniqBy(
        this.allStyleTokensAndOverrides()
          .flatMap((token) => token.variantedValues)
          .flatMap((value) => value.variants)
          .filter(
            (variant) =>
              variant.parent && !isMediaQueryVariantGroup(variant.parent)
          ),
        "uuid"
      ),
    { funcKey: "contextGlobalVariantsWithVariantedTokens" }
  );
  allMixins = deepMapMemoized(
    this.cache,
    () => allMixins(this.site, { includeDeps: "all" }),
    { funcKey: "allMixins" }
  );
  allImageAssets = deepMapMemoized(
    this.cache,
    () => allImageAssets(this.site, { includeDeps: "all" }),
    { funcKey: "allImageAssets" }
  );
  componentToReferenced = deepMapMemoized(this.cache, componentToReferenced, {
    funcKey: "componentToReferenced",
  });
  shouldWrapSlotContentInDataCtxReader = deepMapMemoized(
    this.cache,
    shouldWrapSlotContentInDataCtxReader,
    {
      funcKey: "shouldWrapSlotContentInDataCtxReader",
    }
  );
  objToDepMap = deepMapMemoized(this.cache, () => buildObjToDepMap(this.site), {
    funcKey: "objToDepmap",
  });
}

export class ComponentGenHelper {
  private cache: Map<string, DeepMap<any>> = new Map();
  constructor(
    public siteHelper: SiteGenHelper,
    public resolver: CssVarResolver | undefined
  ) {}

  get site() {
    return this.siteHelper.site;
  }

  get isStudio() {
    return this.siteHelper.isStudio;
  }

  variantComboSorter = deepMapMemoized(
    this.cache,
    (component: Component) => {
      return makeVariantComboSorter(this.site, component);
    },
    {
      funcKey: "variantComboSorter",
    }
  );
  getExpr = deepMapMemoized(
    this.cache,
    (tpl: TplNode, vs: VariantSetting) => {
      const rs = this.makeLayoutAwareRuleSet(vs.rs, isBaseVariant(vs.variants));
      if (rs.mixins.length === 0) {
        return readonlyRSH(rs, tpl);
      } else {
        return createExpandedRuleSetMerger(rs, tpl);
      }
    },
    { funcKey: "getExpr" }
  );
  getEffectiveVariantSetting = deepMapMemoized(
    this.cache,
    (tpl: TplNode, activeVariants: VariantCombo) => {
      const component = this.owningComponent(tpl);
      return getEffectiveVariantSetting(
        tpl,
        activeVariants,
        this.variantComboSorter(component),
        component
      );
    },
    {
      funcKey: "getEffectiveVariantSetting",
      argKeys: ([tpl, activeVariants]) => [
        tpl,
        variantComboKey(activeVariants),
      ],
    }
  );
  owningComponent = deepMapMemoized(
    this.cache,
    (tpl: TplNode) => $$$(tpl).owningComponent(),
    { funcKey: "owningComponent" }
  );
  getEffectiveExpr = deepMapMemoized(
    this.cache,
    (tpl: TplNode, variantCombo: VariantCombo) => {
      return this.getEffectiveVariantSetting(tpl, variantCombo).rsh();
    },
    {
      funcKey: "getEffectiveExpr",
      argKeys: ([tpl, combo]) => [tpl, variantComboKey(combo)],
    }
  );
  getEffectiveExprWithTheme = deepMapMemoized(
    this.cache,
    (tpl: TplNode, variantCombo: VariantCombo) => {
      return this.getEffectiveVariantSetting(tpl, variantCombo).rshWithTheme();
    },
    {
      funcKey: "getEffectiveExprWithTheme",
      argKeys: ([tpl, combo]) => [tpl, variantComboKey(combo)],
    }
  );
  makeLayoutAwareRuleSet = deepMapMemoized(this.cache, makeLayoutAwareRuleSet, {
    funcKey: "makeLayoutAwareRuleSet",
  });
  layoutParent = deepMapMemoized(
    this.cache,
    function layoutParent(tpl: TplNode, throughSlot: boolean) {
      return $$$(tpl).layoutParent({ throughSlot }).maybeOneTpl();
    },
    { funcKey: "layoutParent" }
  );
  deepLayoutParent = deepMapMemoized(
    this.cache,
    function layoutParent(tpl: TplNode) {
      return $$$(tpl).layoutParent({ throughSlot: true }).maybeOneTpl();
    },
    { funcKey: "deepLayoutParent" }
  );
  isTextArgNodeOfSlot = deepMapMemoized(this.cache, isTextArgNodeOfSlot, {
    funcKey: "isTextArgNodeOfSlot",
  });
  getSortedVSettings = deepMapMemoized(
    this.cache,
    (node: TplNode) => {
      const component = this.owningComponent(node);
      const sorter = this.variantComboSorter(component);
      return sortedVariantSettings(node.vsettings, sorter);
    },
    { funcKey: "getSortedVSettings" }
  );
  flattenComponent = deepMapMemoized(
    this.cache,
    (component: Component) => flattenTpls(component.tplTree),
    { funcKey: "flattenComponent" }
  );
}
