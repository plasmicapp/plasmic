import {
  ResolvedToken,
  TokenType,
  TokenValue,
  extractAllReferencedTokenIds,
  resolveToken,
  tryParseTokenRef,
} from "@/wab/commons/StyleToken";
import { DeepReadonly } from "@/wab/commons/types";
import { FramePinManager } from "@/wab/shared/PinManager";
import { readonlyRSH } from "@/wab/shared/RuleSetHelpers";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  CodeComponentVariant,
  VariantCombo,
  isCodeComponentVariant,
  isGlobalVariant,
  isPrivateStyleVariant,
  isStyleOrCodeComponentVariant,
  isVariantSettingEmpty,
  variantComboKey,
} from "@/wab/shared/Variants";
import {
  getBuiltinComponentRegistrations,
  isBuiltinCodeComponent,
} from "@/wab/shared/code-components/builtin-code-components";
import {
  CustomFunctionId,
  customFunctionId,
} from "@/wab/shared/code-components/code-components";
import {
  getVariantMeta,
  isTplRootWithCodeComponentVariants,
} from "@/wab/shared/code-components/variants";
import {
  buildUidToNameMap,
  getNamedDescendantNodes,
  makeNodeNamerFromMap,
} from "@/wab/shared/codegen/react-p";
import { nodeNameBackwardsCompatibility } from "@/wab/shared/codegen/react-p/constants";
import {
  customInsertMaps,
  ensure,
  ensureArray,
  filterFalsy,
  maybeMemoizeFn,
  switchType,
  tuple,
  withoutNils,
  xAddAll,
  xSetDefault,
} from "@/wab/shared/common";
import {
  PageComponent,
  allComponentVariants,
  getComponentDisplayName,
  getNonVariantParams,
  getParamNames,
  isCodeComponent,
  isPlumeComponent,
  tryGetVariantGroupValueFromArg,
} from "@/wab/shared/core/components";
import { isRealCodeExpr } from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import {
  extractAllAssetRefs,
  getTagAttrForImageAsset,
} from "@/wab/shared/core/image-assets";
import { ParamExportType } from "@/wab/shared/core/lang";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import {
  allGlobalVariantGroups,
  allGlobalVariants,
  allImageAssets,
  allStyleTokens,
  isHostLessPackage,
} from "@/wab/shared/core/sites";
import { isOnChangeParam } from "@/wab/shared/core/states";
import { expandRuleSets } from "@/wab/shared/core/styles";
import {
  findExprsInComponent,
  findExprsInNode,
  flattenTpls,
  isTplComponent,
  isTplIcon,
  isTplPicture,
  isTplVariantable,
} from "@/wab/shared/core/tpls";
import { getProjectFlags } from "@/wab/shared/devflags";
import mobx from "@/wab/shared/import-mobx";
import { keyedComputedFn, maybeComputedFn } from "@/wab/shared/mobx-util";
import {
  ArenaFrame,
  CodeComponentVariantMeta,
  CodeLibrary,
  Component,
  ComponentSwapSplitContent,
  ComponentVariantSplitContent,
  CustomFunction,
  DataSourceOpExpr,
  Expr,
  GlobalVariantSplitContent,
  ImageAsset,
  Mixin,
  PageHref,
  Param,
  QueryInvalidationExpr,
  RuleSet,
  Site,
  StyleToken,
  TplComponent,
  TplNode,
  TplSlot,
  Variant,
  VariantGroup,
  VariantSetting,
  isKnownCustomCode,
  isKnownDataSourceOpExpr,
  isKnownImageAssetRef,
  isKnownPageHref,
  isKnownQueryInvalidationExpr,
  isKnownQueryRef,
  isKnownTplRef,
  isKnownVarRef,
} from "@/wab/shared/model/classes";
import { parse$$PropertyAccesses } from "@/wab/shared/utils/regex-dollardollar";
import {
  makeVariantComboSorter,
  sortedVariantSettings,
} from "@/wab/shared/variant-sort";
import { getTplVisibilityAsDescendant } from "@/wab/shared/visibility-utils";
import { keyBy } from "lodash";

export const flattenComponent = maybeComputedFn(function flattenComponent(
  component: Component
) {
  return component.tplTree ? flattenTpls(component.tplTree) : [];
});

export const extractComponentVariantSettings = maybeComputedFn(
  (site: Site, component: Component, ordered: boolean) => {
    const sorter = ordered
      ? makeVariantComboSorter(site, component)
      : undefined;
    const result: [VariantSetting, TplNode][] = [];
    for (const tpl of flattenComponent(component)) {
      if (isTplVariantable(tpl)) {
        const vsettings = sorter
          ? sortedVariantSettings(tpl.vsettings, sorter)
          : tpl.vsettings;
        for (const vs of vsettings) {
          result.push([vs, tpl]);
        }
      }
    }
    return result;
  }
);

export const extractImageAssetRefsByAttrs = maybeComputedFn(
  function extractImageAssetRefsByAttrs(site: Site, component: Component) {
    const assets = new Set<ImageAsset>();
    for (const tpl of flattenComponent(component)) {
      if (isTplVariantable(tpl)) {
        xAddAll(assets, tplToUsedImageAssets(site, tpl));
      }
    }
    return assets;
  }
);

export const findNonEmptyCombos = maybeComputedFn(function findNonEmptyCombos(
  component: Component
) {
  const combos = new Map<string, VariantCombo>();
  for (const tpl of flattenComponent(component)) {
    if (isTplVariantable(tpl)) {
      for (const vs of tpl.vsettings) {
        const combo = vs.variants.filter((v) => !isPrivateStyleVariant(v));
        if (combo.length > 1 && !isVariantSettingEmpty(vs)) {
          const comboKey = variantComboKey(vs.variants);
          if (!combos.has(comboKey)) {
            combos.set(comboKey, combo);
          }
        }
      }
    }
  }
  return [...combos.values()];
});

export const usesVariantGroup = maybeComputedFn(function usesVariantGroup(
  component: Component,
  group: VariantGroup
) {
  const variants = new Set(group.variants);
  for (const tpl of flattenComponent(component)) {
    if (isTplVariantable(tpl)) {
      for (const vs of tpl.vsettings) {
        if (
          vs.variants.some((v) => variants.has(v)) &&
          !isVariantSettingEmpty(vs)
        ) {
          return true;
        }
      }
    }
  }
  return false;
});

export const siteToAllGlobalVariants = maybeComputedFn(
  function siteToAllGlobalVariants(site: Site) {
    return allGlobalVariants(site, { includeDeps: "direct" });
  }
);

export const componentToAllVariants = maybeComputedFn(
  function componentToAllVariants(component: Component) {
    return allComponentVariants(component, {
      includeSuperVariants: true,
    });
  }
);

export const usedHostLessPkgs = maybeComputedFn(function usedHostLessPkgs(
  site: Site
) {
  const usedPkgs = new Set<string>();
  if (isHostLessPackage(site)) {
    usedPkgs.add(site.hostLessPackageInfo.name);
  }
  walkDependencyTree(site, "all").forEach(
    (dep) =>
      isHostLessPackage(dep.site) &&
      usedPkgs.add(dep.site.hostLessPackageInfo.name)
  );
  return Array.from(usedPkgs.keys());
});

export const usedGlobalVariantGroups = maybeComputedFn(
  function usedGlobalVariantGroups(site: Site, component: Component) {
    const groups = allGlobalVariantGroups(site, { includeDeps: "direct" });
    return groups.filter((g) => usesVariantGroup(component, g));
  }
);

export const usedScreenVariantGroups = maybeComputedFn(
  function usedScreenVariantGroups(site: Site, component: Component) {
    return usedGlobalVariantGroups(site, component).filter(
      (g) => g === site.activeScreenVariantGroup
    );
  }
);

export const componentToElementNames = maybeComputedFn(
  (component: Component) => {
    const nodeNamer = computedNodeNamer(component);
    return getNamedDescendantNodes(nodeNamer, component.tplTree).flatMap(
      (x) => {
        const nodeName = nodeNamer(x);
        return [
          nodeName,
          ...(nodeName && !x.name && nodeName in nodeNameBackwardsCompatibility
            ? ensureArray(nodeNameBackwardsCompatibility[nodeName]).map(
                (prevNodeName) => prevNodeName
              )
            : []),
        ];
      }
    );
  }
);

export const componenToNonVariantParamNames = maybeComputedFn(
  (component: Component) => [
    ...getParamNames(
      component,
      getNonVariantParams(component).filter(
        (p) =>
          // we need to omit onChange from the list of arg props, same
          // behavior of getArgParams() in codegen
          !(
            component.plumeInfo &&
            isOnChangeParam(p, component) &&
            p.variable.name === "onChange"
          ) && p.exportType !== ParamExportType.ToolsOnly
      )
    ),
  ]
);

export const componentToVariantParamNames = maybeComputedFn(
  function componentToVariantParamNames(component: Component) {
    return getParamNames(
      component,
      component.variantGroups
        .filter((vg) => vg.variants.length > 0)
        .map((p) => p.param)
    );
  }
);

export const computedNodeNamer = maybeComputedFn(function makeNodeNamer_(
  component: Component
) {
  // We only want to create a new nodeNamer if the actual set of names and their
  // mappings to uid has changed.
  const uidToNameMap = mobx
    .computed(() => buildUidToNameMap(component), {
      equals: mobx.comparer.shallow,
    })
    .get();
  return makeNodeNamerFromMap(uidToNameMap);
});

export const computedProjectFlags = maybeComputedFn(getProjectFlags);

/**
 * Returns a mapping from argument `comp`'s param names, to
 * [TplComponent, Param], where the TplComponent is a descendent
 * TplComponent, and this prop is linked to that TplComponent's
 * Param arg.  Note that TplComponent may not just be a child of
 * `comp`; could also be a descendant of `comp`, if it wraps another
 * Plasmic component that wraps another Plasmic component that exposes
 * the code component prop.
 */
export const getLinkedCodeProps = maybeComputedFn(function getLinkedProps(
  comp: Component
) {
  const attr2LinkedCodeProp = new Map<string, [TplComponent, Param]>();

  /**
   * Records that `attr`, name of a param from from argument `comp`,
   * is linked to  `innerTpl`'s `linkedParam` arg. `innerTpl` is
   * a child of `comp`.
   */
  const recordParam = (
    attr: string,
    innerTpl: TplComponent,
    linkedParam: Param
  ) => {
    if (
      isCodeComponent(innerTpl.component) ||
      isPlumeComponent(innerTpl.component)
    ) {
      // If this is a code / plume component tpl, then there's
      // nothing to recurse into; we've found it
      attr2LinkedCodeProp.set(attr, [innerTpl, linkedParam]);
    } else {
      // Otherwise, innerTpl.component may also be a component
      // wrapping and exposing code / plume component props.
      // We descend.
      const maybeDeepLinkedParam = getLinkedCodeProps(innerTpl.component).get(
        linkedParam.variable.name
      );
      if (maybeDeepLinkedParam) {
        attr2LinkedCodeProp.set(attr, maybeDeepLinkedParam);
      }
    }
  };

  for (const tpl of flattenComponent(comp)) {
    if (isTplComponent(tpl)) {
      tpl.vsettings.forEach((vs) => {
        vs.args.forEach((arg) => {
          if (isKnownVarRef(arg.expr)) {
            recordParam(arg.expr.variable.name, tpl, arg.param);
          }
        });
      });
    }
  }
  for (const state of comp.states) {
    if (state.tplNode && state.implicitState) {
      const tpl = state.tplNode;
      if (isTplComponent(tpl)) {
        recordParam(state.param.variable.name, tpl, state.implicitState.param);
      }
    }
  }
  return attr2LinkedCodeProp;
});

export const componentToReferencers = maybeComputedFn(
  function componentToReferencers(site: Site) {
    const compToReferencers = new Map<Component, Set<Component>>(
      site.components.map((comp) => tuple(comp, new Set<Component>()))
    );
    for (const comp of site.components) {
      // This is basically the reverse map of componentToReferenced
      for (const refComp of componentToReferenced(comp)) {
        if (site.components.includes(refComp)) {
          ensure(
            compToReferencers.get(refComp),
            () => `Unknown refenrencer ${getComponentDisplayName(refComp)}`
          ).add(comp);
        }
      }
    }
    return compToReferencers;
  }
);

export const deepComponentToReferencers = maybeComputedFn(
  function deepComponentToReferencers(site: Site) {
    const compToReferencers = componentToReferencers(site);
    const deepCompToReferencers = new Map<Component, Set<Component>>();

    const getDeepReferencers = (comp: Component): Set<Component> => {
      if (deepCompToReferencers.has(comp)) {
        return ensure(
          deepCompToReferencers.get(comp),
          () =>
            `Missing deep refs for component ${getComponentDisplayName(comp)}`
        );
      }
      const shallowReferencers = [
        ...ensure(
          compToReferencers.get(comp),
          () =>
            `Missing referencers for component ${getComponentDisplayName(comp)}`
        ),
      ];
      const deepReferencers = new Set([
        ...shallowReferencers,
        ...shallowReferencers.flatMap((c) => [...getDeepReferencers(c)]),
      ]);
      deepCompToReferencers.set(comp, deepReferencers);
      return deepReferencers;
    };

    for (const comp of site.components) {
      getDeepReferencers(comp);
    }

    return deepCompToReferencers;
  }
);

/**
 * Given a component, returns all other components that are used
 * directly as a TplComponent instance or TplRef in its tree
 */
export const componentToReferenced = maybeComputedFn(
  function componentToReferenced(component: Component) {
    const referenced = new Set<Component>();
    for (const tpl of flattenComponent(component)) {
      if (isTplComponent(tpl)) {
        referenced.add(tpl.component);
      }
      findExprsInNode(tpl).forEach(({ expr }) => {
        if (isKnownTplRef(expr) && isTplComponent(expr.tpl)) {
          referenced.add(expr.tpl.component);
        }
      });
    }
    return Array.from(referenced);
  }
);

/**
 * Given a component, returns all components transitively used by this component
 */
export function componentToDeepReferenced(
  component: Component,
  includeSubComps = false
) {
  // `computedFn` can't take functions with optional parameters
  // See https://app.shortcut.com/plasmic/story/18666/
  return _componentToDeepReferenced(component, includeSubComps);
}

const _componentToDeepReferenced = maybeComputedFn(
  function _componentToDeepReferenced(
    component: Component,
    includeSubComps: boolean
  ) {
    const seen = new Set<Component>();

    const extract = (comp: Component) => {
      if (seen.has(comp)) {
        return;
      }

      seen.add(comp);
      for (const sub of componentToReferenced(comp)) {
        extract(sub);
      }

      if (includeSubComps) {
        for (const sub of comp.subComps) {
          extract(sub);
        }
      }
    };

    extract(component);
    return seen;
  }
);

export const componentsReferecerToPageHref = maybeComputedFn(
  function componentsReferecerToPageHref(site: Site, page: PageComponent) {
    const isHRefToPage = (expr: Expr | null | undefined): expr is PageHref =>
      isKnownPageHref(expr) && expr.page === page;

    const usingComponents = new Set<Component>();

    for (const c of site.components) {
      const exprs = cachedExprsInComponent(c);
      if (exprs.some(({ expr }) => isHRefToPage(expr))) {
        usingComponents.add(c);
      }
    }
    return usingComponents;
  }
);

export const allCustomFunctions = maybeComputedFn(function allCustomFunctions(
  rootSite: Site
) {
  const functionIds = new Set<CustomFunctionId>();
  const customFunctions: { site: Site; customFunction: CustomFunction }[] = [];
  [
    rootSite,
    ...walkDependencyTree(rootSite, "all").map((dep) => dep.site),
  ].forEach((site) =>
    site.customFunctions.forEach((customFunction) => {
      if (!functionIds.has(customFunctionId(customFunction))) {
        functionIds.add(customFunctionId(customFunction));
        customFunctions.push({ site, customFunction });
      }
    })
  );
  return customFunctions;
});

export const allCodeLibraries = maybeComputedFn(function allCodeLibraries(
  rootSite: Site
) {
  const codeLibNames = new Set<string>();
  const libs: { site: Site; codeLibrary: CodeLibrary }[] = [];
  [
    rootSite,
    ...walkDependencyTree(rootSite, "all").map((dep) => dep.site),
  ].forEach((site) =>
    site.codeLibraries.forEach((lib) => {
      if (!codeLibNames.has(lib.name)) {
        codeLibNames.add(lib.name);
        libs.push({ site, codeLibrary: lib });
      }
    })
  );
  return libs;
});

export const cachedExprsInComponent = maybeComputedFn(
  function cachedExprsInComponent(component: Component) {
    return findExprsInComponent(component);
  }
);

export const customFunctionsAndLibsUsedByComponent = maybeComputedFn(
  function customFunctionsAndLibsUsedByComponent(
    site: Site,
    component: Component
  ) {
    const codeExprs = filterFalsy(
      cachedExprsInComponent(component).map(
        ({ expr }) => isKnownCustomCode(expr) && isRealCodeExpr(expr) && expr
      )
    );
    const usedFunctionIds = new Set<string>(
      codeExprs.flatMap(({ code }) => parse$$PropertyAccesses(code))
    );
    const codeLibraryByJsIdentifier = new Map(
      allCodeLibraries(site).map(({ codeLibrary }) => [
        codeLibrary.jsIdentifier,
        codeLibrary,
      ])
    );
    const usedLibraries = new Map<CodeLibrary, "all" | Set<string>>();
    usedFunctionIds.forEach((id) => {
      const [namespace, functionName] = id.split(".");
      const lib = codeLibraryByJsIdentifier.get(namespace);
      if (lib) {
        if (lib.importType === "namespace" && !!functionName) {
          const usedFns = xSetDefault(usedLibraries, lib, () => new Set());
          if (usedFns !== "all") {
            usedFns.add(functionName);
          }
        } else {
          usedLibraries.set(lib, "all");
        }
      }
    });
    return {
      customFunctions: allCustomFunctions(site)
        .map(({ customFunction }) => customFunction)
        .filter(
          (fn) =>
            usedFunctionIds.has(customFunctionId(fn)) ||
            // If someone does `const L = $$.lodash;`, we should include all
            // functions in `lodash` namespace!
            (fn.namespace && usedFunctionIds.has(fn.namespace))
        ),
      codeLibraries: Array.from(usedLibraries.entries()).map(
        ([lib, imports]) =>
          [lib, imports === "all" ? "all" : Array.from(imports.keys())] as const
      ),
    };
  }
);

/**
 * Returns all instances of TplComponent for the argument component
 */
export const componentToTplComponents = maybeComputedFn(
  function getTplComponentsInSite(site: Site, component: Component) {
    const instances: TplComponent[] = [];
    for (const comp of site.components) {
      for (const node of flattenComponent(comp)) {
        if (isTplComponent(node) && node.component === component) {
          instances.push(node);
        }
      }
    }
    return instances;
  }
);

/** Token resolver that returns the value and token. */
export type TokenResolver = (
  token: StyleToken,
  vsh?: VariantedStylesHelper
) => ResolvedToken;
export const makeTokenResolver = maybeComputedFn(
  function makeTokenValueResolver(site: Site): TokenResolver {
    const allTokens = siteToAllTokens(site);
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
      map.set(token, tokenMap);
    });

    return (
      token: StyleToken,
      maybeVsh?: VariantedStylesHelper
    ): ResolvedToken => {
      const vsh = maybeVsh ?? new VariantedStylesHelper();
      const tokenMap = ensure(
        map.get(token),
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
  token: StyleToken,
  vsh?: VariantedStylesHelper
) => TokenValue;
export const makeTokenValueResolver = (site: Site): TokenValueResolver => {
  const tokenResolver = makeTokenResolver(site);
  return (token: StyleToken, maybeVsh?: VariantedStylesHelper): TokenValue => {
    return tokenResolver(token, maybeVsh).value;
  };
};

export const getTplComponentFetchers = maybeComputedFn(
  function getTplComponentFetchers(component: Component) {
    return flattenComponent(component)
      .filter(isTplComponent)
      .filter(
        (tpl) =>
          isBuiltinCodeComponent(tpl.component) &&
          tpl.component.name ===
            getBuiltinComponentRegistrations().PlasmicFetcher.meta.name
      );
  }
);

export const makeTokenRefResolver = maybeComputedFn(
  function makeTokenRefResolver(site: Site) {
    const tokenResolver = makeTokenValueResolver(site);
    const allTokens = siteToAllTokensDict(site);
    return (maybeRef: string, vsh?: VariantedStylesHelper) => {
      const maybeToken = tryParseTokenRef(maybeRef, allTokens);
      if (maybeToken) {
        return tokenResolver(maybeToken, vsh);
      }
      return undefined;
    };
  }
);

export const siteToAllTokensDict = maybeComputedFn((site: Site) =>
  keyBy(siteToAllTokens(site), (t) => t.uuid)
);

export const siteToAllTokens = maybeComputedFn((site: Site) =>
  allStyleTokens(site, { includeDeps: "all" })
);

export const siteToAllDirectTokens = maybeComputedFn((site: Site) =>
  allStyleTokens(site, { includeDeps: "direct" })
);

export const siteToAllDirectTokensOfType = maybeComputedFn(
  (site: Site, type: TokenType) =>
    siteToAllDirectTokens(site).filter((t) => t.type === type)
);

export const siteToAllImageAssetsDict = maybeComputedFn((site: Site) =>
  keyBy(allImageAssets(site, { includeDeps: "all" }), (x) => x.uuid)
);

export const componentToUsedTokens = maybeComputedFn(
  function componentsToUsedTokens(site: Site, component: Component) {
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
) {
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
) {
  const exp = readonlyRSH(rs, tpl);
  const allTokensDict = siteToAllTokensDict(site);
  const collector = new Set<StyleToken>();
  for (const prop of exp.props()) {
    const val = exp.getRaw(prop);
    if (val) {
      const refTokenIds = extractAllReferencedTokenIds(val);
      const refTokens = withoutNils(refTokenIds.map((x) => allTokensDict[x]));
      xAddAll(collector, refTokens);
      for (const token of refTokens) {
        xAddAll(collector, usedTokensForToken(site, token));
      }
    }
  }
  return [...collector.keys()];
});

const usedTokensForToken = maybeComputedFn(function collectUsedTokensForToken(
  site: Site,
  token: StyleToken
) {
  const allTokensDict = siteToAllTokensDict(site);
  const collector = new Set<StyleToken>();
  let sub = tryParseTokenRef(token.value, allTokensDict);
  while (sub) {
    collector.add(sub);
    sub = tryParseTokenRef(sub.value, allTokensDict);
  }
  return [...collector.keys()];
});

export const componentToUsedMixins = maybeComputedFn(
  function componentToUsedMixins(component: Component) {
    const mixins = new Set<Mixin>();
    for (const tpl of flattenComponent(component)) {
      if (isTplVariantable(tpl)) {
        xAddAll(mixins, tplToUsedMixins(tpl));
      }
    }
    return mixins;
  }
);

const tplToUsedMixins = maybeComputedFn(function tplToUsedMixins(tpl: TplNode) {
  const mixins = new Set<Mixin>();
  for (const vs of tpl.vsettings) {
    xAddAll(mixins, vs.rs.mixins);
  }
  return [...mixins.keys()];
});

export const componentToUsedImageAssets = maybeComputedFn(
  function componentToUsedImageAssets(site: Site, component: Component) {
    const assets = new Set<ImageAsset>();
    for (const tpl of flattenComponent(component)) {
      if (isTplVariantable(tpl)) {
        xAddAll(assets, tplToUsedImageAssets(site, tpl));
      }
    }
    return [...assets.keys()];
  }
);

const tplToUsedImageAssets = maybeComputedFn(function tplToUsedImageAssets(
  site: Site,
  tpl: TplNode
) {
  const assets = new Set<ImageAsset>();
  const assetType = isTplIcon(tpl)
    ? ImageAssetType.Icon
    : isTplPicture(tpl)
    ? ImageAssetType.Picture
    : undefined;

  if (assetType) {
    for (const vs of tpl.vsettings) {
      const expr = vs.attrs[getTagAttrForImageAsset(assetType)];
      if (expr && isKnownImageAssetRef(expr)) {
        assets.add(expr.asset);
      }
    }
  }

  if (assetType === ImageAssetType.Icon) {
    return [...assets.keys()];
  }

  const allAssetsDict = siteToAllImageAssetsDict(site);
  for (const vs of tpl.vsettings) {
    const rulesets = expandRuleSets([vs.rs]);
    for (const rs of rulesets) {
      for (const refId of expToPictureAssetRefs(rs, tpl)) {
        if (refId in allAssetsDict) {
          assets.add(allAssetsDict[refId]);
        }
      }
    }
  }

  return [...assets.keys()];
});

const expToPictureAssetRefs = maybeComputedFn(function expToPictureAssetRefs(
  rs: DeepReadonly<RuleSet>,
  tpl: TplNode
) {
  const exp = readonlyRSH(rs, tpl);
  const refIds: string[] = [];
  const val = exp.getRaw("background");
  if (val) {
    refIds.push(...extractAllAssetRefs(val));
  }
  return refIds;
});

export const getAllUsedImageAssets = maybeComputedFn(
  function getAllUsedImageAssets(site: Site) {
    const usedAssets = new Set<ImageAsset>();
    for (const comp of site.components) {
      const usedAssetsByComponent = componentToUsedImageAssets(site, comp);
      xAddAll(usedAssets, usedAssetsByComponent);
    }
    return usedAssets;
  }
);

export const getComponentsUsingImageAsset = maybeComputedFn(
  function getComponentsUsingImageAsset(site: Site, asset: ImageAsset) {
    return site.components.filter((comp) => {
      if (isCodeComponent(comp)) {
        return false;
      }

      for (const tpl of flattenComponent(comp)) {
        if (
          isTplVariantable(tpl) &&
          tplToUsedImageAssets(site, tpl).includes(asset)
        ) {
          return true;
        }
      }
      return false;
    });
  }
);

export const findAllQueryInvalidationExpr = maybeComputedFn(
  function findDataSourceInteractions(site: Site) {
    return site.components.flatMap((c) =>
      flattenTpls(c.tplTree).flatMap((tpl) =>
        findExprsInNode(tpl)
          .filter(({ expr }) => isKnownQueryInvalidationExpr(expr))
          .map(({ expr }) => ({
            expr: expr as QueryInvalidationExpr,
            ownerComponent: c,
          }))
      )
    );
  }
);

export const findAllQueryInvalidationExprForComponent = maybeComputedFn(
  function findDataSourceInteractions(component: Component) {
    return flattenTpls(component.tplTree).flatMap((tpl) =>
      findExprsInNode(tpl)
        .filter(({ expr }) => isKnownQueryInvalidationExpr(expr))
        .map(({ expr }) => expr as QueryInvalidationExpr)
    );
  }
);

export const findQueryInvalidationExprWithRefs = maybeComputedFn(
  function findQueryInvalidationExprWithRefs(site: Site, queryRefs: string[]) {
    const queryRefSet = new Set(queryRefs);
    return findAllQueryInvalidationExpr(site).filter(({ expr }) =>
      expr.invalidationQueries.some(
        (key) => isKnownQueryRef(key) && queryRefSet.has(key.ref.uuid)
      )
    );
  }
);

export const findAllDataSourceOpExprForComponent = maybeComputedFn(
  function findAllDataSourceOpExprs(component: Component) {
    return [
      ...withoutNils(component.dataQueries.map((dq) => dq.op)),
      ...flattenTpls(component.tplTree).flatMap((tpl) =>
        findExprsInNode(tpl)
          .filter(({ expr }) => isKnownDataSourceOpExpr(expr))
          .map(({ expr }) => expr as DataSourceOpExpr)
      ),
    ];
  }
);

export const findAllDataSourceOpExpr = maybeComputedFn(
  function findAllDataSourceOpExpr(site: Site) {
    return site.components.flatMap((c) => {
      return [
        ...withoutNils(c.dataQueries.map((dq) => dq.op)).map((op) => {
          return {
            component: c,
            expr: op,
            node: undefined,
          };
        }),
        ...flattenTpls(c.tplTree).flatMap((tpl) => {
          return findExprsInNode(tpl)
            .filter(({ expr }) => isKnownDataSourceOpExpr(expr))
            .map(({ expr }) => {
              return {
                component: c,
                expr: expr as DataSourceOpExpr,
                node: tpl,
              };
            });
        }),
      ];
    });
  }
);

export const getActiveVariantsForFrame = maybeComputedFn(
  function getActiveVariantsForFrame(site: Site, frame: ArenaFrame) {
    const pinManager = new FramePinManager(site, frame);
    return pinManager.activeNonBaseVariants();
  }
);

export const findComponentsUsingComponentVariant = maybeComputedFn(
  function findComponentsUsingComponentVariant(
    site: Site,
    component: Component,
    variant: Variant
  ) {
    if (isStyleOrCodeComponentVariant(variant) || isGlobalVariant(variant)) {
      return new Set<Component>();
    }
    const results = new Set<Component>();
    const referencers =
      componentToReferencers(site).get(component) ?? new Set<Component>();

    const compUsesVariant = (comp: Component) => {
      for (const tpl of flattenComponent(comp)) {
        if (isTplComponent(tpl) && tpl.component === component) {
          for (const vs of tpl.vsettings) {
            for (const arg of vs.args) {
              const r = tryGetVariantGroupValueFromArg(component, arg);
              if (r?.variants.includes(variant)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };

    for (const comp of referencers) {
      if (compUsesVariant(comp)) {
        results.add(comp);
      }
    }

    return results;
  }
);

export const findComponentsUsingGlobalVariant = maybeComputedFn(
  function findComponentsUsingGlobalVariant(site: Site, variant: Variant) {
    const results = new Set<Component>();

    const compUsesVariant = (comp: Component) => {
      for (const [vs] of extractComponentVariantSettings(site, comp, false)) {
        if (vs.variants.includes(variant)) {
          return true;
        }
      }
      return false;
    };

    for (const comp of site.components) {
      if (compUsesVariant(comp)) {
        results.add(comp);
      }
    }

    return results;
  }
);

export const findSplitsUsingVariantGroup = maybeComputedFn(
  function findSplitsUsingVariantGroup(site: Site, variantGroup: VariantGroup) {
    return site.splits.filter((split) =>
      split.slices.some((slice) =>
        slice.contents.some((content) =>
          switchType(content)
            .when(ComponentSwapSplitContent, () => false)
            .when(
              [GlobalVariantSplitContent, ComponentVariantSplitContent],
              (variantContent) => variantContent.group === variantGroup
            )
            .result()
        )
      )
    );
  }
);

export const findStyleTokensUsingVariantGroup = maybeComputedFn(
  function findStyleTokensUsingVariantGroup(
    site: Site,
    variantGroup: VariantGroup
  ) {
    const groupVariants = new Set(variantGroup.variants);
    return site.styleTokens.filter((token) =>
      token.variantedValues.some((value) =>
        value.variants.some((variant) => groupVariants.has(variant))
      )
    );
  }
);

/**
 * Returns true if the argument tpl slot belonging to component
 * is visible when the `variants` are active.
 */
export const isTplSlotVisible = keyedComputedFn(
  function isTplSlotVisible(
    component: Component,
    tpl: TplSlot,
    variants: VariantCombo
  ) {
    return getTplVisibilityAsDescendant(tpl, variants);
  },
  {
    keyFn: (component, tpl, variants) =>
      `${component.uuid}-${tpl.uuid}-${variants.map((v) => v.uuid).join(";")}`,
    name: "isTplSlotVisible",
  }
);

export const componentToUsedDataSources = maybeComputedFn(
  function componentToUsedDataSources(component: Component) {
    const dataSourceCount = new Map<string, number>();
    for (const { expr } of findExprsInComponent(component)) {
      if (!isKnownDataSourceOpExpr(expr)) {
        continue;
      }
      dataSourceCount.set(
        expr.sourceId,
        (dataSourceCount.get(expr.sourceId) ?? 0) + 1
      );
    }
    return dataSourceCount;
  }
);

export const getUsedDataSourcesFromDep = maybeMemoizeFn(
  function getUsedDataSourcesFromDep(site: Site) {
    const dataSourceCount = new Map<string, number>();
    for (const component of site.components) {
      const componentDataSourceCount = componentToUsedDataSources(component);
      customInsertMaps(
        (count1, count2) => count1 + count2,
        dataSourceCount,
        componentDataSourceCount
      );
    }
    return dataSourceCount;
  }
);

export const siteToUsedDataSources = maybeComputedFn(
  function siteToUsedDataSources(site: Site) {
    const dataSourceCount = new Map<string, number>();
    for (const component of site.components) {
      const componentDataSourceCount = componentToUsedDataSources(component);
      customInsertMaps(
        (count1, count2) => count1 + count2,
        dataSourceCount,
        componentDataSourceCount
      );
    }
    const deps = walkDependencyTree(site, "all");
    for (const dep of deps) {
      const depDataSourceCount = getUsedDataSourcesFromDep(dep.site);
      customInsertMaps(
        (count1, count2) => count1 + count2,
        dataSourceCount,
        depDataSourceCount
      );
    }

    // Currently, we're ordering the data sources by the usage count (number of data source exprs).
    // In the future we may want to add a clever heuristic for it.
    const entries = [...dataSourceCount.entries()];
    entries.sort((a, b) => b[1] - a[1]);
    return entries.map((entry) => entry[0]);
  }
);

interface CCVariantInfo {
  component: Component;
  /** A code component style variant's selectors, mapped to thier metas. */
  keysToMetas: Map<string, CodeComponentVariantMeta>;
}

const componentCCVariantsToInfos = maybeComputedFn(
  (component: Component): [CodeComponentVariant, CCVariantInfo][] => {
    const tplRoot = component.tplTree;
    if (isTplRootWithCodeComponentVariants(tplRoot)) {
      const variantMeta = tplRoot.component.codeComponentMeta.variants;
      return component.variants
        .filter(isCodeComponentVariant)
        .map((variant) => [
          variant,
          {
            component,
            keysToMetas: new Map(
              withoutNils(
                variant.codeComponentVariantKeys.map((key) => {
                  const meta = getVariantMeta(variantMeta, key);
                  return meta ? [key, meta] : null;
                })
              )
            ),
          },
        ]);
    }
    return [];
  }
);

export const siteCCVariantsToInfos = maybeComputedFn(
  (site: Site): Map<CodeComponentVariant, CCVariantInfo> => {
    return new Map(
      site.components.flatMap((comp) => componentCCVariantsToInfos(comp))
    );
  }
);
