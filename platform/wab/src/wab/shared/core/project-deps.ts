import { removeFromArray } from "@/wab/commons/collections";
import {
  derefToken,
  hasTokenRefs,
  mkTokenRef,
  replaceAllTokenRefs,
  TokenType,
} from "@/wab/commons/StyleToken";
import {
  getArenaFrames,
  isComponentArena,
  isPageArena,
} from "@/wab/shared/Arenas";
import { flattenComponent } from "@/wab/shared/cached-selectors";
import {
  collectUsedIconAssetsForTpl,
  collectUsedPictureAssetsForTpl,
} from "@/wab/shared/codegen/image-assets";
import { collectUsedMixinsForTpl } from "@/wab/shared/codegen/mixins";
import {
  collectUsedTokensForTpl,
  extractUsedTokensForMixins,
  extractUsedTokensForTokens,
} from "@/wab/shared/codegen/style-tokens";
import {
  assert,
  assignReadonly,
  ensure,
  maybe,
  tuple,
  withoutNils,
} from "@/wab/shared/common";
import {
  getComponentDisplayName,
  isCodeComponent,
  isHostLessCodeComponent,
  isPageComponent,
  isReusableComponent,
  PageComponent,
  removeComponentParam,
} from "@/wab/shared/core/components";
import { isFallbackableExpr, isFallbackSet } from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import {
  hasAssetRefs,
  mkImageAssetRef,
  replaceAllAssetRefs,
} from "@/wab/shared/core/image-assets";
import {
  allGlobalVariants,
  allImageAssets,
  allStyleTokens,
  getAllAttachedTpls,
  getSiteArenas,
  isHostLessPackage,
} from "@/wab/shared/core/sites";
import {
  ensureCorrectImplicitStates,
  getStateDisplayName,
  isPrivateState,
  isStateUsedInExpr,
  removeComponentState,
  removeImplicitStatesAfterRemovingTplNode,
} from "@/wab/shared/core/states";
import { cloneMixin } from "@/wab/shared/core/styles";
import {
  clone,
  findExprsInComponent,
  findExprsInNode,
  flattenTpls,
  isTplColumns,
  isTplComponent,
  isTplImage,
  isTplNamable,
  isTplVariantable,
  replaceTplTreeByEmptyBox,
} from "@/wab/shared/core/tpls";
import { ensureComponentsObserved } from "@/wab/shared/mobx-util";
import {
  ArenaFrame,
  ArenaFrameCell,
  ArenaFrameGrid,
  ArenaFrameRow,
  Component,
  ensureKnownTplComponent,
  Expr,
  GlobalVariantGroup,
  ImageAsset,
  isKnownArenaFrame,
  isKnownComponent,
  isKnownEventHandler,
  isKnownImageAsset,
  isKnownImageAssetRef,
  isKnownPageHref,
  isKnownRenderExpr,
  isKnownStyleTokenRef,
  isKnownTplSlot,
  isKnownVariant,
  isKnownVariantedValue,
  isKnownVariantGroup,
  isKnownVariantsRef,
  isKnownVirtualRenderExpr,
  Mixin,
  Param,
  ProjectDependency,
  RuleSet,
  Site,
  State,
  StyleToken,
  Theme,
  TplNode,
  TplSlot,
  Variant,
  VariantedRuleSet,
  VariantedValue,
  VariantGroup,
  VariantSetting,
} from "@/wab/shared/model/classes";
import {
  renameParamAndFixExprs,
  renameTplAndFixExprs,
} from "@/wab/shared/refactoring";
import {
  fillVirtualSlotContents,
  findParentArgs,
  getTplSlots,
  isSlot,
  revertToDefaultSlotContents,
} from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  areEquivalentScreenVariants,
  isBaseVariant,
  isScreenVariant,
  isScreenVariantGroup,
  VariantGroupType,
} from "@/wab/shared/Variants";
import L from "lodash";

export type DependencyWalkScope = "all" | "direct";

export function walkDependencyTree(site: Site, scope: DependencyWalkScope) {
  const queue: ProjectDependency[] = [...site.projectDependencies];
  const result: ProjectDependency[] = [];
  const traverseIds = new Set(queue.map((item) => item.projectId));

  while (queue.length > 0) {
    const curr = ensure(queue.shift(), "Queue should not be empty");
    result.push(curr);
    // By default only get direct dependencies
    if (scope === "all") {
      // only add those dependencies to the queue which have not already been traversed or queued for traversal
      curr.site.projectDependencies
        .filter((pdep) => !traverseIds.has(pdep.projectId))
        .forEach((pdep) => {
          traverseIds.add(pdep.projectId);
          queue.push(pdep);
        });
    }
  }
  return result;
}

type ObjDepMap = Map<ImportableObject, ProjectDependency>;

export function buildObjToDepMap(site: Site) {
  const map = new Map<ImportableObject, ProjectDependency>();
  for (const d of walkDependencyTree(site, "all")) {
    for (const obj of genImportableObjs(d.site)) {
      map.set(obj, d);
    }
  }
  return map;
}

export function extractTransitiveDepsFromComponents(
  site: Site,
  components: Component[],
  _depMap?: ObjDepMap
) {
  // Reverse to have the direct dependencies have more priority
  const allTokensDict = L.keyBy(
    allStyleTokens(site, { includeDeps: "all" }).reverse(),
    (t) => t.uuid
  );
  const allAssetsDict = L.keyBy(
    allImageAssets(site, { includeDeps: "all" }).reverse(),
    (t) => t.uuid
  );
  const refs = new Set<ImportableObject>();
  for (const component of components) {
    for (const tpl of flattenTpls(component.tplTree)) {
      collectUsedImportableObjectsForTpl(
        refs,
        component,
        tpl,
        allTokensDict,
        allAssetsDict
      );
    }
  }

  return getTransitiveDepsFromObjs(site, [...refs], _depMap);
}

function collectUsedImportableObjectsForTpl(
  refs: Set<ImportableObject>,
  component: Component,
  tpl: TplNode,
  allTokensDict: Record<string, StyleToken>,
  allAssetsDict: Record<string, ImageAsset>
) {
  if (isTplComponent(tpl)) {
    refs.add(tpl.component);
  }

  collectUsedTokensForTpl(refs as Set<StyleToken>, tpl, allTokensDict, {
    derefTokens: false,
    expandMixins: false,
  });
  collectUsedIconAssetsForTpl(refs as Set<ImageAsset>, component, tpl);
  collectUsedPictureAssetsForTpl(refs as Set<ImageAsset>, component, tpl, {
    includeRuleSets: true,
    expandMixins: false,
    allAssetsDict: allAssetsDict,
  });
  collectUsedMixinsForTpl(refs as Set<Mixin>, tpl);
}

export function extractTransitiveHostLessPackages(site: Site) {
  const deps: ProjectDependency[] = [];
  walkDependencyTree(site, "all").forEach((dep) => {
    if (
      isHostLessPackage(dep.site) &&
      !site.projectDependencies.includes(dep) &&
      !deps.includes(dep)
    ) {
      deps.push(dep);
    }
  });
  return deps;
}

export function extractTransitiveDepsFromComponentDefaultSlots(
  site: Site,
  components: Component[],
  _depMap?: ObjDepMap
) {
  // Reverse to have the direct dependencies have more priority
  const allTokensDict = L.keyBy(
    allStyleTokens(site, { includeDeps: "all" }).reverse(),
    (t) => t.uuid
  );
  const allAssetsDict = L.keyBy(
    allImageAssets(site, { includeDeps: "all" }).reverse(),
    (t) => t.uuid
  );
  const refs = new Set<ImportableObject>();
  for (const component of components) {
    for (const slot of getTplSlots(component)) {
      for (const defaultContent of slot.defaultContents) {
        for (const tpl of flattenTpls(defaultContent)) {
          collectUsedImportableObjectsForTpl(
            refs,
            component,
            tpl,
            allTokensDict,
            allAssetsDict
          );
        }
      }
    }
  }

  return getTransitiveDepsFromObjs(site, [...refs], _depMap);
}

export function extractTransitiveDepsFromTokens(
  site: Site,
  tokens: StyleToken[],
  _depMap?: ObjDepMap
) {
  // Reverse to have the direct dependencies have more priority
  const allTokensDict = L.keyBy(
    allStyleTokens(site, { includeDeps: "all" }).reverse(),
    "uuid"
  );
  const refTokens = extractUsedTokensForTokens(tokens, allTokensDict, {
    derefTokens: false,
  });
  return getTransitiveDepsFromObjs(site, [...refTokens], _depMap);
}

export function syncGlobalContexts(
  projectDependency: ProjectDependency,
  site: Site
) {
  projectDependency.site.globalContexts.forEach((gc) => {
    if (
      !site.globalContexts.find((to) => to.component.name === gc.component.name)
    ) {
      site.globalContexts.push(clone(gc));
    }
  });
}

export function extractTransitiveDepsFromMixins(
  site: Site,
  mixins: Mixin[],
  _depMap?: ObjDepMap
) {
  // Reverse to have the direct dependencies have more priority
  const allTokensDict = L.keyBy(
    allStyleTokens(site, { includeDeps: "all" }).reverse(),
    "uuid"
  );
  const refTokens = extractUsedTokensForMixins(mixins, allTokensDict, {
    derefTokens: false,
  });
  return getTransitiveDepsFromObjs(site, [...refTokens], _depMap);
}

export function getTransitiveDepsFromObjs(
  site: Site,
  objs: ImportableObject[],
  _depMap?: ObjDepMap
) {
  // Build a one-level deep set of transitive deps -- deps of our direct deps
  const transitiveDeps = new Set(
    site.projectDependencies.flatMap((dep) => dep.site.projectDependencies)
  );
  const depMap = _depMap ?? buildObjToDepMap(site);
  const allDeps = withoutNils(objs.map((obj) => depMap.get(obj)));
  return allDeps.filter(
    (dep) => transitiveDeps.has(dep) && !site.projectDependencies.includes(dep)
  );
}

export type ImportableObject =
  | Component
  | Mixin
  | StyleToken
  | Theme
  | ImageAsset
  | VariantGroup;

export function* genImportableObjs(site: Site) {
  for (const comp of site.components) {
    yield comp;
  }
  for (const vg of site.globalVariantGroups) {
    yield vg;
  }
  for (const mixin of site.mixins) {
    yield mixin;
  }
  for (const theme of site.themes) {
    yield theme;
  }
  for (const token of site.styleTokens) {
    yield token;
  }
  for (const asset of site.imageAssets) {
    yield asset;
  }
}

function getOrCloneNewAsset(
  tplMgr: TplMgr,
  oldAsset: ImageAsset,
  oldToNewAsset: Map<ImageAsset, ImageAsset | undefined>
) {
  let newAsset = oldToNewAsset.get(oldAsset);
  if (!newAsset) {
    const assetName = tplMgr.getUniqueImageAssetName(oldAsset.name);
    newAsset = tplMgr.addImageAsset({
      name: assetName,
      type: oldAsset.type as ImageAssetType,
      dataUri: oldAsset.dataUri ?? undefined,
      width: oldAsset.width ?? undefined,
      height: oldAsset.height ?? undefined,
      aspectRatio: oldAsset.aspectRatio ?? undefined,
    });
    oldToNewAsset.set(oldAsset, newAsset);
  }
  return newAsset;
}

/**
 * Given a style value, replaces any reference to old image
 * assets with new image assets.
 */
function getNewMaybeImageAssetRefValue(
  tplMgr: TplMgr,
  value: string,
  oldAssets: ImageAsset[],
  oldToNewAsset: Map<ImageAsset, ImageAsset | undefined>
) {
  if (!hasAssetRefs(value)) {
    return value;
  }
  return replaceAllAssetRefs(value, (assetId) => {
    const asset = oldAssets.find((x) => x.uuid === assetId);
    if (!asset) {
      return undefined;
    }
    return mkImageAssetRef(getOrCloneNewAsset(tplMgr, asset, oldToNewAsset));
  });
}

/**
 * Fix references to old images with the new images in a RuleSet
 */
function fixImageAssetRefsForRuleset(
  tplMgr: TplMgr,
  rs: RuleSet,
  oldAssets: ImageAsset[],
  oldToNewAsset: Map<ImageAsset, ImageAsset | undefined>
) {
  const val = rs.values["background"];
  if (val) {
    rs.values["background"] = getNewMaybeImageAssetRefValue(
      tplMgr,
      val,
      oldAssets,
      oldToNewAsset
    );
  }
}

/**
 * Fix reference to new ImageAsset, if expr is an ImageAssetRef
 */
function fixAssetRefForExpr(
  tplMgr: TplMgr,
  expr: Expr,
  oldToNewAsset: Map<ImageAsset, ImageAsset | undefined>
) {
  if (isKnownImageAssetRef(expr) && oldToNewAsset.has(expr.asset)) {
    expr.asset = getOrCloneNewAsset(tplMgr, expr.asset, oldToNewAsset);
  } else if (isFallbackSet(expr)) {
    fixAssetRefForExpr(tplMgr, expr.fallback!, oldToNewAsset);
  }
}

function fixImageAssetRefsForTpl(
  tplMgr: TplMgr,
  tpl: TplNode,
  oldAssets: ImageAsset[],
  oldToNewAsset: Map<ImageAsset, ImageAsset | undefined>
) {
  if (isTplImage(tpl)) {
    // For images, replace ImageAsset references to new ones
    for (const vs of tpl.vsettings) {
      Object.entries(vs.attrs).forEach(([_key, value]) =>
        fixAssetRefForExpr(tplMgr, value, oldToNewAsset)
      );
    }
  }

  if (isTplVariantable(tpl)) {
    for (const vs of tpl.vsettings) {
      fixImageAssetRefsForRuleset(tplMgr, vs.rs, oldAssets, oldToNewAsset);
    }
  }
}

export function fixImageAssetRefsForClonedTemplateComponent(
  tplMgr: TplMgr,
  component: Component,
  oldAssets: ImageAsset[]
) {
  const oldToNewAsset = new Map<ImageAsset, ImageAsset | undefined>(
    oldAssets.map((asset) => tuple(asset, undefined))
  );

  const fix = (comp: Component) => {
    for (const tpl of flattenTpls(comp.tplTree)) {
      fixImageAssetRefsForTpl(tplMgr, tpl, oldAssets, oldToNewAsset);
    }
  };

  fix(component);
  for (const subComp of component.subComps) {
    fix(subComp);
  }
}

function ensureDirectDep(
  site: Site,
  dep: ProjectDependency,
  oldDep?: ProjectDependency
) {
  if (site.projectDependencies.includes(dep)) {
    return;
  }
  // Make sure we don't end up with multiple direct deps with different
  // versions for the same pkgId
  const existingDep = site.projectDependencies.find(
    (d) => d.pkgId === dep.pkgId
  );
  if (existingDep) {
    throw new Error(
      `Cannot upgrade; "${oldDep?.name ?? `Project`}" depends on "${
        dep.name
      }" v${dep.version}, but you currently depend on "${dep.name}" v${
        existingDep.version
      }.  They must match up.`
    );
  }
  site.projectDependencies.push(dep);
}

export function upgradeProjectDeps(
  site: Site,
  deps: {
    oldDep: ProjectDependency;
    newDep?: ProjectDependency;
  }[]
) {
  const newDeps: ProjectDependency[] = [];
  deps.forEach(({ oldDep, newDep }) => {
    upgradeProjectDep(site, oldDep, newDep);
    if (newDep) {
      newDeps.push(newDep);
    }
  });

  // The new components may have content in their default slots that
  // reference transitive deps; they will also need to be installed
  // as direct deps
  newDeps.forEach((newDep) => {
    for (const dep of extractTransitiveDepsFromComponentDefaultSlots(
      site,
      newDep.site.components.filter((c) => isReusableComponent(c))
    )) {
      ensureDirectDep(site, dep);
    }
    for (const dep of extractTransitiveHostLessPackages(site)) {
      ensureDirectDep(site, dep);
    }
    syncGlobalContexts(newDep, site);
  });
}

/**
 * Upgrades `site` to use the `newDep`, which assumes that there's already an
 * existing ProjectDependency for the same `pkgId`.  Basically will look
 * for all instances from the current ProjectDependency, and replace them
 * with new instances from `newDep`.
 */
function upgradeProjectDep(
  site: Site,
  oldDep: ProjectDependency,
  newDep?: ProjectDependency
) {
  // We need to look for and replace these references:
  // 1. TplComponent referencing imported Component.  We need to fix up
  //    the Component, but also the Param refs in VariantSettings.args.
  // 2. VariantSettings referencing imported global variant groups.
  // 3. RuleSets in VariantSettings, Mixins, and Themes referencing
  //    imported StyleTokens, ImageAssets, or Mixins.
  // 4. Image TplTag referencing imported ImageAssets.
  // 5. ArenaFrames referencing imported global variant groups in its
  //    pinMap and target.
  // 6. Style tokens referencing imported style tokens.
  // 7. site.activeTheme, if it was using the activeTheme from this package.
  // 8. Implicit states of imported components.
  //
  // Where we see that things have been deleted in `newDep` (component /
  // style token / mixin / assets removed), we make a clone from the current
  // version and add it to the local site instead.
  const tplMgr = new TplMgr({ site });

  // Mapping old to new component
  const oldToNewComp = new Map<Component, Component | undefined>();
  const oldToNewParam = new Map<Param, Param | undefined>();
  const oldToNewState = new Map<State, State | undefined>();
  const oldToNewPage = new Map<PageComponent, PageComponent | undefined>();

  const mapParams = (oldComp: Component, newComp: Component) => {
    for (const oldParam of oldComp.params) {
      const newParam = newComp.params.find(
        (p) =>
          (p.variable.uuid === oldParam.variable.uuid ||
            p.variable.name === oldParam.variable.name) &&
          isSlot(p) === isSlot(oldParam)
      );
      if (newParam) {
        oldToNewParam.set(oldParam, newParam);
        if (oldParam.variable.name !== newParam.variable.name) {
          // If the param was renamed, we must fix exprs in current site
          // accordingly. For example, suppose the dependency contains a
          // TextInput component with a state "value" that was renamed to "new
          // value"; we want exprs in current site to be updated replacing
          // `$state.textInput.value` with `$state.textInput.newValue`.
          renameParamAndFixExprs(
            site,
            oldComp,
            oldParam,
            newParam.variable.name
          );
        }
      }
    }
  };
  // mapStates should be performed after mapParams, because it depends on it
  const mapStates = (oldComp: Component, newComp?: Component) => {
    for (const oldState of oldComp.states) {
      const newParam = oldToNewParam.get(oldState.param);
      const newState = newComp
        ? newComp.states.find((s) => s.param === newParam)
        : undefined;
      oldToNewState.set(oldState, newState);
    }
  };
  const fixRenamedTpls = (oldComp: Component, newComp: Component) => {
    // We iterate in the tpl tree of oldComp/newComp to fix exprs in case
    // a TplNamable was renamed. That is to fix implicit-implicit-state
    // names in exprs. For example, suppose dependency has a Form
    // component instantiating a TextInput with a value implicit state,
    // and Form made that state public. So a component in current site
    // can be accessing such state using $state.form.textInput.value.
    // If the TplComponent "textInput" was renamed to "newTextInput" in
    // the Form component, we need to update the exprs to use
    // $state.form.newTextInput.value instead.
    const uuidToNewTpls = Object.fromEntries(
      flattenTpls(newComp.tplTree).map((tpl) => [tpl.uuid, tpl])
    );
    for (const tpl of flattenTpls(oldComp.tplTree)) {
      if (!isTplNamable(tpl)) {
        continue;
      }
      const newTpl = uuidToNewTpls[tpl.uuid];
      if (!newTpl || !isTplNamable(newTpl)) {
        continue;
      }
      if (tpl.name !== newTpl.name) {
        renameTplAndFixExprs(site, tpl, newTpl.name);
      }
    }
  };
  const oldDepComponents = oldDep.site.components.filter((c) =>
    isReusableComponent(c)
  );
  const newDepComponents = newDep
    ? newDep.site.components.filter((c) => isReusableComponent(c))
    : undefined;
  for (const oldComp of oldDepComponents) {
    const newComp = newDepComponents
      ? newDepComponents.find((c) => c.uuid === oldComp.uuid)
      : undefined;
    oldToNewComp.set(oldComp, newComp);
    if (newComp) {
      mapParams(oldComp, newComp);
      fixRenamedTpls(oldComp, newComp);
    }
    // Perform mapStates even if newComp is undefined, because we need to
    // know the oldToNewState mapping for implicit states, which may need
    // to be removed.
    mapStates(oldComp, newComp);
  }
  const oldDepPages = oldDep.site.components.filter(isPageComponent);
  const newDepPages = newDep
    ? newDep.site.components.filter(isPageComponent)
    : [];
  for (const oldPage of oldDepPages) {
    const newPage = newDepPages.find((c) => c.uuid === oldPage.uuid);
    oldToNewPage.set(oldPage, newPage);
  }

  const getOrCloneNewComponent = (oldComp: Component) => {
    if (isCodeComponent(oldComp)) {
      if (isHostLessCodeComponent(oldComp)) {
        return ensure(
          oldToNewComp.get(oldComp),
          "Cannot clone host-less code component. Should delete all instances before removing the dependency"
        );
      }
      const newComp = site.components
        .filter(isCodeComponent)
        .find((c) => c.name === oldComp.name);
      // The imported project should be hosted by the same app and therefore
      // have the same code components. We should use the existing code
      // component in the project, so that the slot schemas will remain valid.
      assert(
        newComp,
        `Failed to clone code component ${getComponentDisplayName(oldComp)}.
        The imported project is using a code component that isn't registered.`
      );
      mapParams(oldComp, newComp);
      mapStates(oldComp, newComp);
      return newComp;
    }
    assert(
      oldToNewComp.has(oldComp),
      `Failed to find old component ${getComponentDisplayName(oldComp)}`
    );
    let newComp = oldToNewComp.get(oldComp);
    if (!newComp) {
      const componentName = tplMgr.getUniqueComponentName(oldComp.name);
      const res = tplMgr.cloneComponent(oldComp, componentName, true);
      ensureComponentsObserved([res.component]);
      newComp = res.component;
      oldToNewComp.set(oldComp, newComp);
      mapParams(oldComp, newComp);
      mapStates(oldComp, newComp);

      // Add the newly created tpls to attachedTpls, so they will get
      // fixed up too
      for (const tpl of flattenComponent(newComp)) {
        attachedTpls.add(tpl);
      }
      for (const subDep of extractTransitiveDepsFromComponents(site, [
        newComp,
      ])) {
        ensureDirectDep(site, subDep, oldDep);
      }
    }
    return newComp;
  };

  // Mapping old to new mixin
  const oldToNewMixin = new Map(
    oldDep.site.mixins.map((oldMixin) => {
      const newMixin = newDep
        ? newDep.site.mixins.find((m) => m.uuid === oldMixin.uuid)
        : undefined;
      return tuple(oldMixin, newMixin);
    })
  );
  const getOrCloneNewMixin = (oldMixin: Mixin) => {
    assert(
      oldToNewMixin.has(oldMixin),
      `Failed to find old mixin ${oldMixin.name}`
    );
    let newMixin = oldToNewMixin.get(oldMixin);
    if (!newMixin) {
      const mixinName = tplMgr.getUniqueMixinName(oldMixin.name);
      newMixin = tplMgr.addMixin(mixinName, cloneMixin(oldMixin));
      oldToNewMixin.set(oldMixin, newMixin);
      for (const subDep of extractTransitiveDepsFromMixins(site, [newMixin])) {
        ensureDirectDep(site, subDep, oldDep);
      }
    }
    return newMixin;
  };

  // Mapping old to new token
  const oldToNewToken = new Map(
    oldDep.site.styleTokens.map((oldToken) => {
      const newToken = newDep
        ? newDep.site.styleTokens.find(
            (m) =>
              m.uuid === oldToken.uuid ||
              (m.regKey && m.regKey === oldToken.regKey)
          )
        : undefined;
      return tuple(oldToken, newToken);
    })
  );
  const getOrCloneNewToken = (oldToken: StyleToken) => {
    assert(
      oldToNewToken.has(oldToken),
      `Failed to find old token ${oldToken.name}`
    );
    let newToken = oldToNewToken.get(oldToken);
    const oldTokens = allStyleTokens(oldDep.site, { includeDeps: "all" });
    const siteTokens = allStyleTokens(site, { includeDeps: "all" });
    if (!newToken) {
      // We search into the current site looking for (name, type, value, |variantedValues|) match
      // this can introduce some false positives as we don't check for the variants, but we assume
      // it's too rare to be a problem
      const similarToken = site.styleTokens.find(
        (m) =>
          m.name === oldToken.name &&
          m.type === oldToken.type &&
          derefToken(siteTokens, m) === derefToken(oldTokens, oldToken) &&
          m.variantedValues.length === oldToken.variantedValues.length
      );

      if (similarToken) {
        newToken = similarToken;
        oldToNewToken.set(oldToken, newToken);
      } else {
        const tokenName = tplMgr.getUniqueTokenName(oldToken.name);
        newToken = tplMgr.addToken({
          name: tokenName,
          tokenType: oldToken.type as TokenType,
          value: derefToken(oldTokens, oldToken),
        });
        oldToken.variantedValues.forEach((v) => {
          const newVariants = withoutNils(
            v.variants.map((gv) =>
              oldToNewGlobalVariant.has(gv)
                ? getOrCloneOldGlobalVariant(gv)
                : gv
            )
          );
          if (newVariants.length === 0) {
            return;
          }
          ensure(
            newToken,
            "Unexpected undefined newToken. newToken should be created before"
          ).variantedValues.push(
            new VariantedValue({
              value: derefToken(
                oldTokens,
                oldToken,
                new VariantedStylesHelper(oldDep.site, v.variants)
              ),
              variants: newVariants,
            })
          );
        });

        oldToNewToken.set(oldToken, newToken);
      }
    }
    return newToken;
  };

  // Mapping old to new image asset
  const oldToNewAsset = new Map(
    oldDep.site.imageAssets.map((oldAsset) => {
      const newAsset = newDep
        ? newDep.site.imageAssets.find((m) => m.uuid === oldAsset.uuid)
        : undefined;
      return tuple(oldAsset, newAsset);
    })
  );

  // Mapping old to new GlobalVariant
  const oldToNewGlobalVariantGroup = new Map(
    oldDep.site.globalVariantGroups.map((group) =>
      tuple(
        group,
        newDep?.site.globalVariantGroups.find((g) => g.uuid === group.uuid)
      )
    )
  );
  const getOrCloneGlobalVariantGroup = (oldGroup: GlobalVariantGroup) => {
    assert(
      oldToNewGlobalVariantGroup.has(oldGroup),
      `Failed to find old global variant group ${oldGroup.uuid}`
    );
    let newGroup = oldToNewGlobalVariantGroup.get(oldGroup);
    if (!newGroup && oldGroup.type === VariantGroupType.GlobalScreen) {
      // We do something special for screen group
      // though, merging it with the existing screen group instead.
      let localScreenGroup = site.globalVariantGroups.find(
        (g) => g.type === VariantGroupType.GlobalScreen
      );
      if (!localScreenGroup) {
        localScreenGroup = tplMgr.createScreenVariantGroup();
      }
      newGroup = localScreenGroup;
      oldToNewGlobalVariantGroup.set(oldGroup, localScreenGroup);
    }
    if (!newGroup) {
      // If we still don't have one, then we clone the group locally
      const groupName = tplMgr.getUniqueGlobalVariantGroupName(
        oldGroup.param.variable.name
      );
      newGroup = tplMgr.createGlobalVariantGroup(groupName);
      oldToNewGlobalVariantGroup.set(oldGroup, newGroup);
    }
    return newGroup;
  };
  const oldGlobalVariants = allGlobalVariants(oldDep.site, {
    includeDeps: undefined,
  });
  const newGlobalVariants = new Map(
    (newDep
      ? allGlobalVariants(newDep.site, {
          includeDeps: undefined,
        })
      : []
    ).map((variant) => tuple(variant.uuid, variant))
  );
  const oldToNewGlobalVariant = new Map(
    oldGlobalVariants.map((v) => tuple(v, newGlobalVariants.get(v.uuid)))
  );

  const getOrCloneOldGlobalVariant = (oldVariant: Variant) => {
    assert(
      oldToNewGlobalVariant.has(oldVariant),
      `Failed to find old global variant ${oldVariant.name}`
    );
    let newVariant = oldToNewGlobalVariant.get(oldVariant);
    if (!newVariant) {
      const oldGroup = ensure(
        oldVariant.parent,
        "GlobalVariant should have parent"
      );
      let newGroup = oldToNewGlobalVariantGroup.get(
        oldGroup as GlobalVariantGroup
      );
      if (
        newGroup &&
        newDep &&
        newDep.site.globalVariantGroups.includes(newGroup)
      ) {
        // The group still exists, but just the variant has been removed.
        // We're still using the imported group, which we cannot modify, so
        // there's nothing we can do here...
        return undefined;
      } else {
        if (!newGroup) {
          // The group has been deleted, so we re-create it ourselves locally
          newGroup = getOrCloneGlobalVariantGroup(
            oldGroup as GlobalVariantGroup
          );
        }

        // If this is a screen variant, then re-use a matching screen variant
        // from local if possible
        if (isScreenVariantGroup(newGroup)) {
          newVariant = newGroup.variants.find((v) =>
            areEquivalentScreenVariants(v, oldVariant)
          );
        }

        if (!newVariant) {
          newVariant = tplMgr.createGlobalVariant(newGroup, oldVariant.name);
          if (isScreenVariant(oldVariant)) {
            // Carry over the mediaQuery
            newVariant.mediaQuery = oldVariant.mediaQuery;
          }
        }

        oldToNewGlobalVariant.set(oldVariant, newVariant);
      }
    }
    return newVariant;
  };

  const oldTokens = [...oldToNewToken.keys()];
  /**
   * Given a style value, replaces any reference to old token with
   * new token.  The references are by uuid, so things should
   * basically stay the same, but we will clone old tokens if
   * they have been removed from the new package.
   */
  const getNewMaybeTokenRefValue = (value: string) => {
    if (!hasTokenRefs(value)) {
      return value;
    }
    return replaceAllTokenRefs(value, (tokenId) => {
      const token = oldTokens.find((t) => t.uuid === tokenId);
      if (!token) {
        return undefined;
      }
      return mkTokenRef(getOrCloneNewToken(token));
    });
  };

  const oldAssets = [...oldToNewAsset.keys()];

  // For HRefs: tries to fix the referenced page, and returns true if the
  // expr should be deleted because it references a no longer existing page
  const shouldDeletePageHRef = (expr: Expr) => {
    if (isKnownPageHref(expr) && oldToNewPage.has(expr.page as PageComponent)) {
      const newPage = oldToNewPage.get(expr.page as PageComponent);
      if (newPage) {
        expr.page = newPage;
      } else {
        return true;
      }
    } else if (isKnownEventHandler(expr)) {
      // EventHandler expr can also reference pages, from the
      // "navigate page" interaction
      for (const interaction of expr.interactions) {
        for (const arg of [...interaction.args]) {
          if (shouldDeletePageHRef(arg.expr)) {
            // References a page that doesn't exist anymore; so
            // remove the arg.  We remove it from interaction.args,
            // and return `false` from this function, as we've "fixed it"
            // and don't need to remove the root arg or attr.
            removeFromArray(interaction.args, arg);
          }
        }
      }
    }
    return false;
  };

  /**
   * Fix references to old image / token / mixins with the
   * new image / token / mixins in a RuleSet
   */
  const fixRefsForRuleset = (rs: RuleSet) => {
    for (const key of Object.keys(rs.values)) {
      const val = rs.values[key];
      if (val) {
        rs.values[key] = getNewMaybeTokenRefValue(val);
      }
    }

    fixImageAssetRefsForRuleset(tplMgr, rs, oldAssets, oldToNewAsset);

    if (rs.mixins.some((m) => oldToNewMixin.has(m))) {
      rs.mixins = rs.mixins.map((mixin) =>
        oldToNewMixin.has(mixin) ? getOrCloneNewMixin(mixin) : mixin
      );
    }
  };

  const fixRefsForVariantedStyle = (
    variantedStyle: VariantedValue | VariantedRuleSet
  ) => {
    assignReadonly(variantedStyle, {
      variants: withoutNils(
        variantedStyle.variants.map((v) =>
          oldToNewGlobalVariant.has(v) ? getOrCloneOldGlobalVariant(v) : v
        )
      ),
    });

    if (isKnownVariantedValue(variantedStyle)) {
      variantedStyle.value = getNewMaybeTokenRefValue(variantedStyle.value);
    } else {
      fixRefsForRuleset(variantedStyle.rs);
    }
  };

  const fixRefsForMixin = (mixin: Mixin) => {
    fixRefsForRuleset(mixin.rs);
    mixin.variantedRs.forEach((v) => fixRefsForVariantedStyle(v));
    mixin.variantedRs = mixin.variantedRs.filter((v) => v.variants.length > 0);
  };

  const fixRefsForToken = (token: StyleToken) => {
    token.value = getNewMaybeTokenRefValue(token.value);
    token.variantedValues.forEach((v) => fixRefsForVariantedStyle(v));
    token.variantedValues = token.variantedValues.filter(
      (v) => v.variants.length > 0
    );
  };

  /**
   * Returns true if VariantSetting references an imported global variant
   * from a still-existing global variant group; in that case, we can only
   * remove this VariantSetting, as there's no place to re-create that variant.
   */
  const referencesHopelesslyDeletedGlobalVariant = (vs: VariantSetting) => {
    return vs.variants.some((v) => {
      if (
        !v.parent ||
        oldToNewGlobalVariant.get(v) ||
        newGlobalVariants.has(v.uuid)
      ) {
        // Variant has not been deleted
        return false;
      }

      // Variant has been deleted, but parent group not deleted
      return (
        !!newDep &&
        newDep.site.globalVariantGroups.includes(v.parent as GlobalVariantGroup)
      );
    });
  };

  /**
   * Fixes references within TplNode
   */
  const parentDefaultSlots: any[] = [];

  // We use this instead of isTplAttachedToSite() so we don't have to traverse
  // the site for every tpl
  const attachedTpls = getAllAttachedTpls(site);
  const fixTpl = (tpl: TplNode, owner: Component | ArenaFrame) => {
    // If the Tpl is not attached anymore, cleanup states and return
    if (!attachedTpls.has(tpl)) {
      if (isKnownComponent(owner)) {
        removeImplicitStatesAfterRemovingTplNode(site, owner, tpl);
      }
      return;
    }

    if (!isTplVariantable(tpl)) {
      return;
    }

    // If we see a VariantSetting referencing a now-deleted global variant,
    // then we'll have to just delete the VariantSetting as well :-/
    if (
      tpl.vsettings.some((vs) => referencesHopelesslyDeletedGlobalVariant(vs))
    ) {
      tpl.vsettings = tpl.vsettings.filter(
        (vs) => !referencesHopelesslyDeletedGlobalVariant(vs)
      );
    }

    for (const vs of tpl.vsettings) {
      // Make sure we're pointing to the new global variants
      if (vs.variants.some((v) => oldToNewGlobalVariant.has(v))) {
        vs.variants = vs.variants.map((v) =>
          oldToNewGlobalVariant.has(v)
            ? ensure(
                getOrCloneOldGlobalVariant(v),
                "Unexpected undefined GlobalVariant. If oldToNewGlobalVariant has this variant, " +
                  "it should not return undefined"
              )
            : v
        );
      }
      fixRefsForRuleset(vs.rs);
      for (const [attr, expr] of [...Object.entries(vs.attrs)]) {
        if (shouldDeletePageHRef(expr)) {
          delete vs.attrs[attr];
        }
      }
      for (const arg of [...vs.args]) {
        if (shouldDeletePageHRef(arg.expr)) {
          removeFromArray(vs.args, arg);
        }
      }

      if (
        isBaseVariant(vs.variants) &&
        oldDep.site.globalVariant === vs.variants[0]
      ) {
        vs.variants = newDep ? [newDep.site.globalVariant] : vs.variants;
      }
    }

    if (isTplColumns(tpl) && tpl.columnsSetting?.screenBreakpoint) {
      const variant = tpl.columnsSetting?.screenBreakpoint;
      if (oldToNewGlobalVariant.has(variant)) {
        tpl.columnsSetting.screenBreakpoint = ensure(
          getOrCloneOldGlobalVariant(variant),
          "Unexpected undefined GlobalVariant. If oldToNewGlobalVariant has this variant, " +
            "it should not return undefined"
        );
      }
    }

    if (isTplImage(tpl)) {
      // For images, replace ImageAsset references to new ones
      for (const vs of tpl.vsettings) {
        Object.entries(vs.attrs).forEach(([_key, value]) =>
          fixAssetRefForExpr(tplMgr, value, oldToNewAsset)
        );
      }
    }

    if (isTplComponent(tpl)) {
      // For image props, replace ImageAsset references to new ones
      for (const { expr } of findExprsInNode(tpl)) {
        if (isKnownStyleTokenRef(expr)) {
          if (oldToNewToken.has(expr.token)) {
            expr.token = ensure(
              getOrCloneNewToken(expr.token),
              "Checked before"
            );
          }
        } else {
          fixAssetRefForExpr(tplMgr, expr, oldToNewAsset);
        }
      }
    }

    if (isTplComponent(tpl) && oldToNewComp.has(tpl.component)) {
      if (
        isHostLessCodeComponent(tpl.component) &&
        !oldToNewComp.get(tpl.component)
      ) {
        if (isKnownComponent(owner) && owner.tplTree === tpl) {
          // We need to replace the root, just create an empty free box with
          // all vsettings
          replaceTplTreeByEmptyBox(owner);
        } else {
          $$$(tpl).remove({ deep: true });
        }
        return;
      }
      // For TplComponent, replace reference to Component and Params
      // in our args.
      const oldComp = tpl.component;
      const newComp = getOrCloneNewComponent(oldComp);
      tpl.component = newComp;

      // Ensure that TplComponents of components with public states are named.
      if (
        !tpl.name &&
        tpl.component.states.some((s) => !isPrivateState(s)) &&
        isKnownComponent(owner)
      ) {
        tplMgr.renameTpl(owner, tpl, getComponentDisplayName(tpl.component));
      }

      if (isKnownComponent(owner)) {
        ensureCorrectImplicitStates(site, owner, tpl);
      }

      for (const vs of tpl.vsettings) {
        for (const arg of [...vs.args]) {
          const oldParam = arg.param;
          const newParam = oldToNewParam.get(oldParam);
          if (!newParam) {
            // This param has been deleted, so we delete the
            // corresponding arg.
            if (isKnownRenderExpr(arg.expr)) {
              arg.expr.tpl.forEach((tplNode) => {
                // Mark tpls from the slots as unnatached, as they are going to be removed from the site
                attachedTpls.delete(tplNode);
                // Search for slots and remove them from the parent component
                if (isKnownComponent(owner)) {
                  const slots = flattenTpls(tplNode).filter((t) =>
                    isKnownTplSlot(t)
                  );
                  slots.forEach((tplSlot) => {
                    removeComponentParam(
                      site,
                      owner,
                      (tplSlot as TplSlot).param
                    );
                  });
                }
              });
            }
            removeFromArray(vs.args, arg);
            continue;
          }
          arg.param = newParam;

          const fixRefsForExpr = (expr: Expr) => {
            if (isKnownVariantsRef(expr)) {
              const newGroup = ensure(
                newComp.variantGroups.find((vg) => vg.param === newParam),
                "Expected to find arg pointing to the new variants"
              );
              // Match up the newVariants by uuid, filtering out any
              // variant that has since been deleted.
              let newVariants = withoutNils(
                expr.variants.map((v) =>
                  newGroup.variants.find(
                    (newv) => newv.uuid === v.uuid || newv.name === v.name
                  )
                )
              );
              if (!newGroup.multi && newVariants.length > 1) {
                // It's possible the new group has switched from multi to
                // single, and if so, we make sure we only select one variant
                newVariants = [newVariants[0]];
              }
              expr.variants = newVariants;
            }
            fixAssetRefForExpr(tplMgr, expr, oldToNewAsset);
            if (isFallbackableExpr(expr) && expr.fallback) {
              fixRefsForExpr(expr.fallback);
            }
          };

          if (isKnownVirtualRenderExpr(arg.expr)) {
            revertToDefaultSlotContents(tplMgr, tpl, arg.param.variable);
          } else {
            fixRefsForExpr(arg.expr);
          }
        }
      }
      // Leave renaming the tree to fixes-post-change to avoid forking the
      // virtual render expr.
      fillVirtualSlotContents(tplMgr, tpl, undefined, false);

      // Now, this TplComponent may have been the default content of some
      // local component's slot (say, LocalComp), and there may be different
      // TplComponent instances of the LocalComp that are referencing this
      // TplComponent instance as a VirtualRenderExpr. In that case, since we
      // just updated this TplComponent instance, we may detect that as a change
      // to VirtualRenderExpr and attempt to fork it into a non-virtual RenderExpr.
      // We make sure this doesn't happen by reverting the slot contents to a new
      // VirtualRenderExpr.
      // For example, a Button component is from project "core".  In project "app",
      // I have a Header component, with a slot using a Button instance, and a
      // Header instance that is using the default slot content.  When I upgrade,
      // I will change TplComponent to point to the new Button component, but I don't
      // want to interpret that as forking the slot content of the Header instance.
      // We store it in an array to avoid changing the slot reference to the old
      // dependency if the order of components we process is not optimal.
      for (const { tplComponent: parentTplComponent, arg } of findParentArgs(
        tpl
      )) {
        if (isKnownVirtualRenderExpr(arg.expr)) {
          parentDefaultSlots.push({
            parent: parentTplComponent,
            arg: arg.param.variable,
          });
        }
      }
    }
  };

  const fixComponent = (component: Component) => {
    if (isPageComponent(component)) {
      // Fix page og:image asset
      if (isKnownImageAsset(component.pageMeta.openGraphImage)) {
        component.pageMeta.openGraphImage = getOrCloneNewAsset(
          tplMgr,
          component.pageMeta.openGraphImage,
          oldToNewAsset
        );
      }
    }
    for (const state of [...component.states]) {
      if (state.implicitState && oldToNewState.has(state.implicitState)) {
        const newImplicitState = oldToNewState.get(state.implicitState);
        if (newImplicitState && !isPrivateState(newImplicitState)) {
          state.implicitState = newImplicitState;
        } else {
          const usages = findExprsInComponent(component).filter(({ expr }) =>
            isStateUsedInExpr(state, expr)
          );
          assert(
            usages.length === 0,
            `Can't ${
              newDep ? "upgrade" : "remove"
            } dependency: Variable "${getStateDisplayName(
              state
            )}" is being used in ${getComponentDisplayName(component)}${
              newDep
                ? `${
                    newImplicitState
                      ? " but is no longer public in"
                      : " but it was removed from"
                  } ${getComponentDisplayName(
                    ensureKnownTplComponent(state.tplNode).component
                  )}`
                : ""
            }.`
          );
          removeComponentState(site, component, state);
        }
      }
    }
    for (const tpl of flattenTpls(component.tplTree)) {
      fixTpl(tpl, component);
    }
    component.params.forEach((param) => {
      if (param.defaultExpr) {
        if (shouldDeletePageHRef(param.defaultExpr)) {
          param.defaultExpr = null;
        } else {
          fixAssetRefForExpr(tplMgr, param.defaultExpr, oldToNewAsset);
        }
      }
    });
  };

  // Fix up all components and TplNodes
  for (const component of site.components) {
    fixComponent(component);
  }
  site.globalContexts = site.globalContexts.filter(
    (tpl) => !oldToNewComp.has(tpl.component) || oldToNewComp.get(tpl.component)
  );
  for (const tpl of site.globalContexts) {
    fixTpl(tpl, tpl.component);
  }
  for (const parentToFix of parentDefaultSlots) {
    revertToDefaultSlotContents(tplMgr, parentToFix.parent, parentToFix.arg);
  }

  // Fix up all the ArenaFrames, which can reference imported global variants
  const oldToNewGlobalVariantUuid = new Map(
    Array.from(oldToNewGlobalVariant.entries()).map(([oldv, newv]) =>
      tuple(oldv.uuid, newv?.uuid)
    )
  );
  const fixGlobalPinMap = (pinMap: Record<string, boolean>) => {
    for (const key of L.keys(pinMap)) {
      if (oldToNewGlobalVariantUuid.has(key)) {
        // This is an old global variant uuid
        const oldPin = pinMap[key];
        delete pinMap[key];
        const newKey = oldToNewGlobalVariantUuid.get(key);
        if (newKey) {
          // We had cloned the global variant locally, so restore the pin
          pinMap[newKey] = oldPin;
        }
      }
    }
  };

  const fixArenaGrid = (grid: ArenaFrameGrid) => {
    const fixArenaGridRow = (row: ArenaFrameRow) => {
      const fixArenaGridCell = (cell: ArenaFrameCell) => {
        const cellKey = cell.cellKey;
        if (isKnownVariant(cellKey)) {
          if (oldToNewGlobalVariant.has(cellKey)) {
            const newVariant = getOrCloneOldGlobalVariant(cellKey);
            if (newVariant) {
              cell.cellKey = newVariant;
            } else {
              // The referenced variant no longer exists; delete it
              removeFromArray(row.cols, cell);
              return;
            }
          }
        } else if (L.isArray(cellKey)) {
          if (cellKey.some((v) => oldToNewGlobalVariant.has(v))) {
            const newCellKey = withoutNils(
              cellKey.map((v) =>
                oldToNewGlobalVariant.has(v) ? getOrCloneOldGlobalVariant(v) : v
              )
            );
            if (newCellKey.length !== cellKey.length) {
              // Some referenced global variant no longer exists; delete it
              removeFromArray(row.cols, cell);
            } else {
              cell.cellKey = newCellKey;
            }
          }
        }
      };

      const rowKey = row.rowKey;
      if (isKnownVariantGroup(rowKey)) {
        if (oldToNewGlobalVariantGroup.has(rowKey as GlobalVariantGroup)) {
          const newGroup = oldToNewGlobalVariantGroup.get(
            rowKey as GlobalVariantGroup
          );
          if (newGroup) {
            row.rowKey = newGroup;
          } else {
            // The referenced group no longer exists; delete it
            removeFromArray(grid.rows, row);
            return;
          }
        }
      } else if (isKnownVariant(rowKey)) {
        if (oldToNewGlobalVariant.has(rowKey)) {
          const newVariant = getOrCloneOldGlobalVariant(rowKey);
          if (newVariant) {
            row.rowKey = newVariant;
          } else {
            // The referenced variant no longer exists; delete it
            removeFromArray(grid.rows, row);
            return;
          }
        }
      }

      for (const cell of [...row.cols]) {
        fixArenaGridCell(cell);
      }
    };

    for (const row of [...grid.rows]) {
      fixArenaGridRow(row);
    }
  };

  for (const arena of getSiteArenas(site)) {
    // Fix arena grid keys for page and component arenas
    if (isPageArena(arena)) {
      fixArenaGrid(arena.matrix);
      fixArenaGrid(arena.customMatrix);
    } else if (isComponentArena(arena)) {
      fixArenaGrid(arena.matrix);
      fixArenaGrid(arena.customMatrix);
    }

    // Fix frames in the arena
    for (const frame of getArenaFrames(arena)) {
      if (!isKnownArenaFrame(frame)) {
        continue;
      }

      if (frame.bgColor) {
        frame.bgColor = getNewMaybeTokenRefValue(frame.bgColor);
      }

      fixTpl(frame.container, frame);

      fixGlobalPinMap(frame.pinnedGlobalVariants);
      frame.targetGlobalVariants = withoutNils(
        frame.targetGlobalVariants.map((v) =>
          oldToNewGlobalVariant.has(v) ? getOrCloneOldGlobalVariant(v) : v
        )
      );
    }
  }

  // fix token ref from tokens
  site.styleTokens.forEach((token) => fixRefsForToken(token));
  // fix token ref from mixin
  site.mixins.forEach((mixin) => fixRefsForMixin(mixin));
  // fix token ref from theme
  site.themes.forEach((theme) => {
    fixRefsForMixin(theme.defaultStyle);
    theme.styles.forEach((s) => fixRefsForMixin(s.style));
    Object.values(theme.addItemPrefs).forEach((rs) => fixRefsForRuleset(rs));
  });

  // Fix activeTheme, if we used to be using oldDep's activeTheme
  if (site.activeTheme === oldDep.site.activeTheme) {
    if (newDep) {
      site.activeTheme = newDep.site.activeTheme;
    } else if (oldDep.site.activeTheme) {
      // We're removing this dependency, so revert back to the
      // local default theme.  We could consider making a copy of
      // oldDep.site.activeTheme instead, but we'll need to make sure
      // we also make a copy of the referenced tokens, etc.
      if (site.themes.length > 0) {
        site.activeTheme = site.themes[0];
      } else {
        site.activeTheme = undefined;
      }
    }
  }

  // Fix site default components
  Object.entries(site.defaultComponents).forEach(([kind, c]) => {
    if (oldToNewComp.has(c)) {
      const newComponent = oldToNewComp.get(c);
      if (newComponent) {
        site.defaultComponents[kind] = newComponent;
      } else {
        delete site.defaultComponents[kind];
      }
    }
  });

  const screenGroup = site.activeScreenVariantGroup;
  if (screenGroup && oldDep.site.globalVariantGroups.includes(screenGroup)) {
    if (newDep) {
      const newGroup = newDep.site.globalVariantGroups.find(
        (g) => g.uuid === screenGroup.uuid
      );
      site.activeScreenVariantGroup = newGroup;
    } else {
      // We're removing this dependency, so revert back to the local screen group
      site.activeScreenVariantGroup =
        site.globalVariantGroups.find(isScreenVariantGroup);
    }
  }

  // Fix site pageWrapper
  site.pageWrapper = maybe(
    site.pageWrapper,
    (pw) => oldToNewComp.get(pw) ?? pw
  );

  // Finally, swap out oldDep with newDep
  if (newDep) {
    const index = site.projectDependencies.indexOf(oldDep);
    site.projectDependencies[index] = newDep;
  } else {
    removeFromArray(site.projectDependencies, oldDep);
  }
}
