import { TokenType } from "@/wab/commons/StyleToken";
import {
  arrayReversed,
  removeFromArray,
  tryRemoveFromArray,
} from "@/wab/commons/collections";
import {
  FrameViewMode,
  cloneArenaFrame,
  ensureActivatedScreenVariantsForArena,
  ensureFrameSizeForTargetScreenVariant,
  getArenaFrames,
  getFrameHeight,
  isComponentArena,
  isMixedArena,
  mkArenaFrame,
  mkMixedArena,
  normalizeMixedArenaFrames,
  removeVariantGroupFromArenas,
  removeVariantsFromArenas,
} from "@/wab/shared/Arenas";
import {
  ARENA_CAP,
  FRAME_LOWER,
  MIXIN_CAP,
  VARIANT_CAP,
  VARIANT_GROUP_CAP,
  VARIANT_OPTION_LOWER,
} from "@/wab/shared/Labels";
import {
  IRuleSetHelpersX,
  RSH,
  RuleSetHelpers,
  extractStyles,
} from "@/wab/shared/RuleSetHelpers";
import { mkScreenVariantGroup } from "@/wab/shared/SpecialVariants";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
import {
  VariantCombo,
  VariantGroupType,
  allVariantsInGroup,
  areEquivalentScreenVariants,
  ensureValidCombo,
  ensureVariantSetting,
  getBaseVariant,
  getPartitionedScreenVariants,
  hasScreenVariant,
  hasStyleOrCodeComponentVariant,
  isBaseVariant,
  isCodeComponentVariant,
  isGlobalVariant,
  isGlobalVariantGroup,
  isScreenVariant,
  isScreenVariantGroup,
  isStandaloneVariant,
  isStandaloneVariantGroup,
  isStyleOrCodeComponentVariant,
  isStyleVariant,
  isVariantSettingEmpty,
  mkBaseVariant,
  mkComponentVariantGroup,
  mkGlobalVariantGroup,
  mkVariant,
  mkVariantSetting,
  tryGetVariantSetting,
} from "@/wab/shared/Variants";
import {
  findQueryInvalidationExprWithRefs,
  flattenComponent,
} from "@/wab/shared/cached-selectors";
import { toClassName, toVarName } from "@/wab/shared/codegen/util";
import {
  assert,
  check,
  ensure,
  ensureArray,
  ensureArrayOfInstances,
  isSubList,
  leftZip,
  maybe,
  maybeInstance,
  mkShortId,
  remove,
  removeWhere,
  strictFind,
  tryRemove,
  uniqueName,
  withoutNils,
  xDifference,
  xGroupBy,
} from "@/wab/shared/common";
import {
  deriveDefaultFrameSize,
  ensureManagedFrameForVariantInComponentArena,
  ensureRowForVariantGroupInComponentArena,
  isCustomComponentFrame,
  isGlobalVariantFrame,
  isSuperVariantFrame,
  maybeEnsureManagedFrameForGlobalVariantInComponentArena,
  mkComponentArena,
  moveVariantCellInComponentArena,
  removeCustomComponentFrame,
  removeSuperOrGlobalVariantComponentFrame,
} from "@/wab/shared/component-arenas";
import {
  ComponentType,
  PageComponent,
  allComponentVariants,
  cloneComponent,
  clonePageMeta,
  cloneVariant,
  extractParamsFromPagePath,
  findStateForParam,
  getComponentDisplayName,
  getFolderComponentDisplayName,
  getSubComponents,
  isCodeComponent,
  isContextCodeComponent,
  isFrameComponent,
  isPageComponent,
  mkComponent,
  mkPageMeta,
  mkVariantGroupArgExpr,
  removeVariantGroup,
  tryGetVariantGroupValueFromArg,
} from "@/wab/shared/core/components";
import { clone } from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import {
  extractImageAssetUsages,
  mkImageAsset,
  removeImageAssetUsage,
} from "@/wab/shared/core/image-assets";
import { mkOnChangeParamForState, mkParam } from "@/wab/shared/core/lang";
import {
  fixImageAssetRefsForClonedTemplateComponent,
  upgradeProjectDeps,
  walkDependencyTree,
} from "@/wab/shared/core/project-deps";
import {
  ensureScreenVariantsOrderOnMatrices,
  getAllSiteFrames,
  getComponentArena,
  getPageArena,
  getReferencingComponents,
  getReferencingFrames,
  getSiteArenas,
  isFrameRootTplComponent,
  removeReferencingLinks,
  removeReferencingTypeInstances,
} from "@/wab/shared/core/sites";
import {
  SplitStatus,
  SplitType,
  mkGlobalVariantSplit,
  removeVariantGroupFromSplits,
} from "@/wab/shared/core/splits";
import {
  genOnChangeParamName,
  isPrivateState,
  isStateUsedInExpr,
  mkState,
  removeComponentState,
  updateStateAccessType,
} from "@/wab/shared/core/states";
import { SIZE_PROPS } from "@/wab/shared/core/style-props";
import {
  changeTokenUsage,
  cloneMixin,
  cloneStyleToken,
  extractTokenUsages,
  mkRuleSet,
} from "@/wab/shared/core/styles";
import {
  TplNamable,
  cloneVariantSetting,
  findExprsInComponent,
  findVariantSettingsUnderTpl,
  fixTextChildren,
  flattenTpls,
  getAllEventHandlersForTpl,
  hasTextAncestor,
  isComponentRoot,
  isTplCodeComponent,
  isTplColumn,
  isTplColumns,
  isTplComponent,
  isTplNamable,
  isTplSlot,
  isTplTag,
  isTplTagOrComponent,
  isTplTextBlock,
  isTplVariantable,
  mkTplComponent,
  mkTplTagX,
  reconnectChildren,
  summarizeTpl,
  trackComponentSite,
  walkTpls,
} from "@/wab/shared/core/tpls";
import { ScreenSizeSpec } from "@/wab/shared/css-size";
import { CONTENT_LAYOUT_INITIALS } from "@/wab/shared/default-styles";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { Pt, Rect, findSpaceForRectSweepRight } from "@/wab/shared/geom";
import { instUtil } from "@/wab/shared/model/InstUtil";
import {
  Arena,
  ArenaFrame,
  Arg,
  Component,
  ComponentArena,
  ComponentDataQuery,
  ComponentVariantGroup,
  Expr,
  GlobalVariantGroup,
  ImageAsset,
  Mixin,
  Param,
  ProjectDependency,
  Site,
  Split,
  State,
  StyleToken,
  Theme,
  TplComponent,
  TplNode,
  TplTag,
  Var,
  Variant,
  VariantGroup,
  VariantSetting,
  VariantedRuleSet,
  VariantedValue,
  VariantsRef,
  ensureKnownEventHandler,
  ensureKnownVariantGroup,
  ensureKnownVariantsRef,
  isKnownArenaFrame,
  isKnownComponent,
  isKnownEventHandler,
  isKnownImageAsset,
  isKnownMixin,
  isKnownStyleToken,
  isKnownTheme,
  isKnownTplNode,
  isKnownVariantsRef,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import {
  addScreenSizeToPageArenas,
  ensureManagedRowForVariantInPageArena,
  mkPageArena,
  reorderPageArenaCols,
} from "@/wab/shared/page-arenas";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";
import {
  renameParamAndFixExprs,
  renameTplAndFixExprs,
} from "@/wab/shared/refactoring";
import { FrameSize } from "@/wab/shared/responsiveness";
import { setPageSizeType } from "@/wab/shared/sizingutils";
import { makeComponentSwapper } from "@/wab/shared/swap-components";
import {
  TplVisibility,
  getVariantSettingVisibility,
  hasVisibilitySetting,
  isInvisible,
  setTplVisibility,
} from "@/wab/shared/visibility-utils";
import { isString, memoize, pickBy, uniqBy } from "lodash";
import flatten from "lodash/flatten";
import has from "lodash/has";
import kebabCase from "lodash/kebabCase";
import keyBy from "lodash/keyBy";
import repeat from "lodash/repeat";
import trim from "lodash/trim";
import uniq from "lodash/uniq";
import without from "lodash/without";
import { CSSProperties } from "react";

export const DEFAULT_MARGIN_FOR_NEW_FRAMES = 80;

export function ensureBaseVariant(comp: Component) {
  if (comp.variants.length === 0) {
    comp.variants.push(mkBaseVariant());
  }
  return comp.variants[0];
}

export const getTplComponentArg = (
  tpl: TplComponent,
  vs: VariantSetting,
  argVar: Var
) => {
  return vs.args.find((arg) => arg.param.variable === argVar);
};

export const setTplComponentArg = (
  tpl: TplComponent,
  vs: VariantSetting,
  argVar: Var,
  expr: Expr
) => {
  let arg = getTplComponentArg(tpl, vs, argVar);
  if (arg) {
    arg.expr = expr;
  } else {
    arg = new Arg({
      param: strictFind(tpl.component.params, (p) => p.variable === argVar),
      expr,
    });
    vs.args.push(arg);
  }
};

export const unsetTplComponentArg = (tpl: TplComponent, argVar: Var) => {
  tpl.vsettings.forEach((vs) => {
    const idx = vs.args.findIndex((arg) => arg.param.variable === argVar);
    if (idx !== -1) {
      vs.args.splice(idx, 1);
    }
  });
};

export const unsetTplVariantableAttr = (tpl: TplNode, attr: string) => {
  tpl.vsettings.forEach((vs) => {
    delete vs.attrs[attr];
  });
};

export const enum VariantOptionsType {
  multiChoice = "multiChoice",
  singleChoice = "singleChoice",
  standalone = "standalone",
}

/**
 * These variable names are reserved because they would conflict with generated TypeScript props.
 * TODO: Consider changing codegen to not have name conflicts somehow?
 */
export const reservedVariableNames = [
  "args",
  "className",
  "key",
  "style",
  "overrides",
  "root", // allowed for root tpl
  "variants",
] as const;

export function uniquePagePath(path: string, existingPaths: string[]): string {
  function normalize(p: string) {
    return p.replaceAll(/\[[^\]]*]/g, "[]");
  }

  // Compare paths with the path parameter names masked out.
  const [normalizedPath, ...normalizedPaths] = [path, ...existingPaths].map(
    (p) => normalize(p)
  );

  if (normalizedPaths.includes(normalizedPath)) {
    // Find the last static segment, and rename that part.
    // If there is none, or if the path is just /, prepend /new-page/.
    // Then try again.
    //
    // Paths must end with either:
    //
    // - /                   -> /new-page
    // - /[slug]/[x]         -> /new-page/[slug]/[x]
    // - /...part            -> /...part-2
    // - /...part/[slug]/[x] -> /...part-2/[slug]/[x]
    const matchFirstOrSecondCase = path.match(/^\/$|^((\/\[[^\]]*\])*)$/);
    if (matchFirstOrSecondCase) {
      path = `/new-page${matchFirstOrSecondCase[1] ?? ""}`;
    } else {
      path = path.replace(
        /^(.*?)\/([^/]+)((\/\[[^\]]*\])*)$/,
        (substr, prefix, lastStaticSegment, lastDynamicSegments) => {
          const first = uniqueName(
            existingPaths.map((p) =>
              p.replace(/(.*?)((\/\[[^\]]*\])*)$/, "$1")
            ),
            prefix + "/" + lastStaticSegment,
            { separator: "-", normalize }
          );
          return `${first}${lastDynamicSegments}`;
        }
      );
    }
    return uniquePagePath(path, existingPaths);
  } else {
    return path;
  }
}

/**
 * This is a collection of core data model operations.  Originally was just
 * focused on managing TplNodes, but now covers anything related to a Site.
 */
export class TplMgr {
  constructor(private readonly args: { site: Site }) {}

  private site() {
    return this.args.site;
  }

  getComponents() {
    return this.site().components;
  }

  *findAllVariantSettings({
    ordered,
    excludeCodeComponent,
  }: {
    ordered: boolean;
    excludeCodeComponent?: boolean;
  }) {
    for (const c of this.site().components) {
      if (excludeCodeComponent && isCodeComponent(c)) {
        continue;
      }
      const tplNode = c.tplTree;
      yield* findVariantSettingsUnderTpl(
        tplNode,
        ordered
          ? {
              site: this.site(),
              component: c,
            }
          : undefined
      );
    }

    // yield* findVariantSettingsUnderComponents(this.site().components, ordered ? {site: this._site} : undefined);
  }

  findComponentContainingBaseVariant(variant: Variant) {
    return ensure(
      this.site().components.find(
        (component) => getBaseVariant(component) === variant
      ),
      "Expected to find a component with the given base variant"
    );
  }

  findComponentContainingTpl(tpl: TplNode) {
    return $$$(tpl).tryGetOwningComponent();
  }

  filterAllNodes<T extends TplNode>(filter: (node: TplNode) => node is T): T[];
  filterAllNodes(filter: (node: TplNode) => boolean): TplNode[];
  filterAllNodes(filter: (node: TplNode) => boolean): TplNode[] {
    return flatten(
      this.site().components.map((c) => flattenComponent(c).filter(filter))
    );
  }

  private removeResponsiveColumnBreakpoints(toRemove: Set<Variant>) {
    this.filterAllNodes(isTplColumns).forEach((columns) => {
      if (
        columns.columnsSetting?.screenBreakpoint &&
        toRemove.has(columns.columnsSetting.screenBreakpoint)
      ) {
        columns.columnsSetting = null;
      }
    });
  }

  private removeVariantSettings(toRemove: Set<Variant>) {
    // First remove all VariantSettings referring to the removed Variants.
    [...this.findAllVariantSettings({ ordered: false })].forEach(
      ([vs, tpl]) => {
        // All variants combo with the removed variants involved are removed.
        if (vs.variants.find((v) => toRemove.has(v))) {
          remove(tpl.vsettings, vs);
        }
      }
    );
  }

  removeVariantRefsByArg(toRemove: Set<Variant>, component: Component) {
    for (const [vs, tpl] of this.findAllVariantSettings({ ordered: false })) {
      if (isTplComponent(tpl) && tpl.component === component) {
        for (const arg of [...vs.args]) {
          const r = tryGetVariantGroupValueFromArg(component, arg);
          if (!r) {
            continue;
          }
          if (r.vg.multi) {
            this.setArg(
              tpl,
              vs,
              arg.param.variable,
              mkVariantGroupArgExpr(without(r.variants, ...toRemove))
            );
          } else if (r.variants.length > 0 && toRemove.has(r.variants[0])) {
            this.delArg(tpl, vs, arg.param.variable);
          }
        }
      }
    }
  }

  tryRemoveVariant(
    variant: Variant | Variant[],
    component: Component | undefined
  ) {
    assert(!isBaseVariant(variant), "Base variant can not be removed");

    const variants = ensureArray(variant);

    if (variants.length === 0) {
      return;
    }

    if (component && isStandaloneVariant(variants[0])) {
      const group = ensure(
        variants[0].parent,
        "Standalone variant must have parent (group)"
      );
      const state = ensure(
        findStateForParam(component, group.param),
        "Variant group param must correspond to state"
      );
      assert(
        findExprsInComponent(component).filter(({ expr }) =>
          isStateUsedInExpr(state, expr)
        ).length === 0,
        "Cannot delete variant group: being used by dynamic expressions"
      );
      return removeVariantGroup(this.site(), component, group);
    }

    if (
      isScreenVariant(variants[0]) &&
      variants[0].parent?.variants.length === 1
    ) {
      removeVariantGroupFromArenas(this.site(), variants[0].parent, component);
    }

    const removedVariants = new Set(variants);
    this.removeVariantSettings(removedVariants);
    this.removeResponsiveColumnBreakpoints(removedVariants);
    if (component) {
      this.removeVariantRefsByArg(removedVariants, component);
    } else {
      assert(
        variants.every((v) => isGlobalVariant(v)),
        "Expected all variants to be global variants"
      );
    }

    removeVariantsFromArenas(this.site(), variants, component);

    this.tryRemoveVariantFromVariantedRuleSets(variants);
    this.tryRemoveVariantFromVariantedValue(variants);

    // The last thing we do is detach the variants from their parent groups
    // This is to ensure that we are able to use the parent in the previous
    // steps
    for (const v of variants) {
      if (isStyleOrCodeComponentVariant(v)) {
        tryRemove(
          ensure(component, "Expected component to be not null").variants,
          v
        );
      } else {
        const group = ensureKnownVariantGroup(v.parent);
        remove(group.variants, v);
      }
    }

    ensureScreenVariantsOrderOnMatrices(this.site());
  }

  tryRemoveVariantFromVariantedRuleSets(variants: Variant[]) {
    const removeFromVariantedRs = (variantedRuleSets: VariantedRuleSet[]) => {
      removeWhere(variantedRuleSets, (variantedRs) =>
        variants.some((variant) => variantedRs.variants.includes(variant))
      );
    };
    this.site().mixins.forEach((mixin) => {
      removeFromVariantedRs(mixin.variantedRs);
    });
    this.site().themes.forEach((theme) => {
      removeFromVariantedRs(theme.defaultStyle.variantedRs);
      theme.styles.forEach((style) => {
        removeFromVariantedRs(style.style.variantedRs);
      });
    });
  }

  tryRemoveVariantFromVariantedValue(variants: Variant[]) {
    const removeFromVariantedValue = (variantedValues: VariantedValue[]) => {
      removeWhere(variantedValues, (variantedValue) =>
        variants.some((variant) => variantedValue.variants.includes(variant))
      );
    };
    this.site().styleTokens.forEach((styleToken) => {
      removeFromVariantedValue(styleToken.variantedValues);
    });
  }

  removeStyleOrCodeComponentVariantIfEmptyAndUnused(
    component: Component,
    variant: Variant
  ) {
    assert(
      isStyleOrCodeComponentVariant(variant),
      "Given variant should be a registered variant"
    );

    if (isStyleVariant(variant) && variant.selectors.length > 0) {
      return;
    }

    if (
      isCodeComponentVariant(variant) &&
      variant.codeComponentVariantKeys.length > 0
    ) {
      return;
    }

    const isUsed =
      this.findReferencingTplsWithNonEmptySetting(component.tplTree, [variant])
        .length > 0;
    if (!isUsed) {
      this.tryRemoveVariant(variant, component);
    }
  }

  findReferencingTplsWithNonEmptySetting(tpl: TplNode, variants: Variant[]) {
    return flattenTpls(tpl).filter((_tpl) => {
      if (!isTplVariantable(_tpl)) {
        return false;
      }

      return _tpl.vsettings.some(
        (vs) => isSubList(vs.variants, variants) && !isVariantSettingEmpty(vs)
      );
    });
  }

  createVariant(
    component: Component,
    group: ComponentVariantGroup,
    name?: string
  ) {
    assert(
      component.variantGroups.includes(group),
      "Given variant group should exist in component"
    );
    name = this.getUniqueVariantName(group, name);
    const variant = mkVariant({
      name,
      parent: group,
    });
    group.variants.push(variant);

    if (isPageComponent(component)) {
      const arena = getPageArena(this.site(), component);
      if (arena) {
        ensureManagedRowForVariantInPageArena(this.site(), arena, variant);
      }
    } else {
      const arena = getComponentArena(this.site(), component);
      if (arena) {
        ensureManagedFrameForVariantInComponentArena(
          this.site(),
          arena,
          variant
        );
      }
    }
    return variant;
  }

  createStyleVariant(component: Component, selectors: string[] = []) {
    const variant = mkVariant({
      name: "",
      selectors,
    });
    component.variants.push(variant);

    const arena = getComponentArena(this.site(), component);
    if (arena) {
      ensureManagedFrameForVariantInComponentArena(this.site(), arena, variant);
    }
    return variant;
  }

  createCodeComponentVariant(
    component: Component,
    codeComponentName: string,
    codeComponentVariantKeys: string[] = []
  ) {
    const variant = mkVariant({
      name: "",
      codeComponentName,
      codeComponentVariantKeys,
    });
    component.variants.push(variant);

    const arena = getComponentArena(this.site(), component);
    if (arena) {
      ensureManagedFrameForVariantInComponentArena(this.site(), arena, variant);
    }
    return variant;
  }

  createPrivateStyleVariant(
    component: Component,
    tpl: TplNode,
    selectors: string[] = []
  ) {
    const variant = mkVariant({
      name: "",
      forTpl: tpl,
      selectors,
    });
    component.variants.push(variant);
    return variant;
  }

  createVariantGroup({
    component,
    name,
    optionsType = VariantOptionsType.singleChoice,
  }: {
    component: Component;
    name?: string;
    optionsType?: VariantOptionsType;
  }) {
    const groupName =
      name ??
      `Unnamed ${
        optionsType === VariantOptionsType.standalone
          ? VARIANT_CAP
          : VARIANT_GROUP_CAP
      }`;

    const paramName = this.getUniqueParamName(component, groupName);

    const param = mkParam({
      name: paramName,
      type: typeFactory.text(),
      paramType: "state",
    });

    const onChangeParam = mkOnChangeParamForState(
      "variant",
      this.getUniqueParamName(component, genOnChangeParamName(paramName)),
      {
        privateState: true,
      }
    );

    const group = mkComponentVariantGroup({
      param,
      multi: optionsType === VariantOptionsType.multiChoice,
      variants:
        optionsType === VariantOptionsType.standalone
          ? [mkVariant({ name: paramName })]
          : [],
    });

    const linkedState = mkState({
      param,
      variableType: "variant",
      onChangeParam,
      variantGroup: group,
    });

    component.states.push(linkedState);
    component.variantGroups.push(group);
    component.params.push(param, onChangeParam);

    const arena = getComponentArena(this.site(), component);
    if (arena) {
      ensureRowForVariantGroupInComponentArena(this.site(), arena, group);
    }

    return group;
  }

  createGlobalVariantGroup(name?: string) {
    name = this.getUniqueGlobalVariantGroupName(
      name ?? `Unnamed Global ${VARIANT_GROUP_CAP}`
    );
    const param = mkParam({
      name,
      type: typeFactory.text(),
      paramType: "globalVariantGroup",
    });
    const group = mkGlobalVariantGroup({
      param,
      variants: [],
      type: VariantGroupType.GlobalUserDefined,
    });
    this.site().globalVariantGroups.push(group);
    return group;
  }

  createScreenVariant({ name, spec }: { name: string; spec: ScreenSizeSpec }) {
    const site = this.site();
    if (!site.activeScreenVariantGroup) {
      site.activeScreenVariantGroup =
        this.site().globalVariantGroups.find(isScreenVariantGroup);
      if (!site.activeScreenVariantGroup) {
        site.activeScreenVariantGroup = this.createScreenVariantGroup();
      }
    }
    const screenVariantGroup = ensure(
      site.activeScreenVariantGroup,
      "Expected site to have an active screen variant group"
    );

    const variant = this.createGlobalVariant(screenVariantGroup, name, {
      mediaQuery: spec.query(),
    });

    this.ensureScreenVariantsForFrames();
    ensureScreenVariantsOrderOnMatrices(this.site());

    return variant;
  }

  createScreenVariantGroup() {
    const site = this.site();
    assert(
      !site.activeScreenVariantGroup &&
        !site.globalVariantGroups.some((g) => isScreenVariantGroup(g)),
      "Expected site to not have screen variant groups"
    );
    const group = mkScreenVariantGroup();
    site.globalVariantGroups.push(group);
    site.activeScreenVariantGroup = group;
    return group;
  }

  createGlobalVariant(
    group: VariantGroup,
    name?: string,
    extra?: {
      // We add media query already when creating a variant so that screen variants
      // have a mediaQuery as soon as created
      mediaQuery: string | undefined | null;
    }
  ) {
    assert(
      isGlobalVariantGroup(group),
      "Expected given variant group to be global"
    );
    name = this.getUniqueVariantName(group, name);
    const variant = mkVariant({
      name,
      parent: group,
      ...(extra || {}),
    });
    group.variants.push(variant);

    for (const arena of this.site().componentArenas) {
      maybeEnsureManagedFrameForGlobalVariantInComponentArena(
        this.site(),
        arena,
        variant
      );
    }

    return variant;
  }

  removeGlobalVariantGroup(group: VariantGroup) {
    // Create a copy of the group's variants, since removing variants
    // will detach them from the group. Ensure that we pass a stable
    // reference
    this.tryRemoveVariant([...group.variants], undefined);
    removeVariantGroupFromArenas(this.site(), group, undefined);
    remove(this.site().globalVariantGroups, group);
    removeVariantGroupFromSplits(this.site(), group);
  }

  removeState(component: Component, state: State) {
    removeComponentState(this.site(), component, state);
  }

  updateVariantGroupMulti(group: VariantGroup, multi: boolean) {
    if (group.multi === multi) {
      return;
    }

    // Convert all existing TplComponent.args referencing this variant group between
    // single value and array value
    for (const [vs, tpl] of this.findAllVariantSettings({ ordered: false })) {
      if (isTplComponent(tpl)) {
        for (const arg of vs.args) {
          if (arg.param !== group.param) {
            continue;
          }
          const r = ensureKnownVariantsRef(arg.expr);
          const adjustedVariants = multi ? r.variants : r.variants.slice(0, 1);
          arg.expr = mkVariantGroupArgExpr(adjustedVariants);
        }
      }
    }
    group.multi = multi;

    // If no longer multi, then our frame pins only at most one variant in this group
    if (!multi) {
      const allVariants = allVariantsInGroup(group);
      for (const frame of getAllSiteFrames(this.site())) {
        for (const pinMap of [
          frame.pinnedVariants,
          frame.pinnedGlobalVariants,
        ]) {
          const pinned = allVariants.filter((v) => has(pinMap, v.uuid));
          if (pinned.length > 1) {
            pinned.slice(1).forEach((v) => delete pinMap[v.uuid]);
          }
        }
      }
    }
  }

  updateScreenVariantQuery(variant: Variant, query: string) {
    assert(
      isScreenVariant(variant),
      "Expected given variant to be a screen variant"
    );
    variant.mediaQuery = query;
    for (const arena of getSiteArenas(this.site())) {
      ensureFrameSizeForTargetScreenVariant(this.site(), arena, variant);
      ensureActivatedScreenVariantsForArena(this.site(), arena);
    }
    ensureScreenVariantsOrderOnMatrices(this.site());
  }

  /**
   * Looks through VariantSettings, and if foreign screen variants
   * are found, then best-effort maps to activeScreenVariantGroup,
   * or else drop the corresponding VariantSettings. Only relelvant
   * if we are cloning a component from an imported project.
   */
  private ensureComponentUsesActiveScreenVariantGroup(component: Component) {
    const activeGroup = this.site().activeScreenVariantGroup;
    for (const tpl of flattenComponent(component)) {
      if (isTplVariantable(tpl)) {
        for (const vs of [...tpl.vsettings]) {
          if (
            vs.variants.some(
              (v) => isScreenVariant(v) && v.parent !== activeGroup
            )
          ) {
            if (!activeGroup) {
              removeFromArray(tpl.vsettings, vs);
            } else {
              const mapped = vs.variants.map((v) => {
                if (isScreenVariant(v) && v.parent !== activeGroup) {
                  // A foreign screen variant! Map to the active
                  // screen variant group
                  return activeGroup.variants.find((activeV) =>
                    areEquivalentScreenVariants(v, activeV)
                  );
                } else {
                  // Keep all other variants
                  return v;
                }
              });
              if (mapped.some((v) => !v)) {
                // Some foreign screen variants failed to be mapped;
                // can't do anything about that, so just remove them.
                removeFromArray(tpl.vsettings, vs);
              } else {
                vs.variants = mapped as Variant[];
              }
            }
          }
        }
      }
    }
  }

  ensureBaseVariant(comp: Component) {
    return ensureBaseVariant(comp);
  }

  ensureBaseVariantSetting(tpl: TplNode): VariantSetting {
    const variant = this.getBaseVariantForNode(tpl);
    return ensureVariantSetting(tpl, [variant]);
  }

  getBaseVariantForNode(tpl: TplNode): Variant {
    const variant = this.tryGetBaseVariantForNode(tpl);
    if (!variant) {
      throw new Error("Cannot determine the base variant");
    }
    return variant;
  }

  tryGetBaseVariantForNode(tpl: TplNode): Variant | undefined {
    const comp = $$$(tpl).tryGetOwningComponent();
    if (comp) {
      return this.ensureBaseVariant(comp);
    } else if (isFrameRootTplComponent(this.site(), tpl)) {
      return this.site().globalVariant;
    } else {
      return undefined;
    }
  }

  getArg(tpl: TplComponent, vs: VariantSetting, argVar: Var) {
    return getTplComponentArg(tpl, vs, argVar);
  }

  delArg(tpl: TplComponent, vs: VariantSetting, argVar: Var) {
    return check(this.tryDelArg(tpl, vs, argVar));
  }

  tryDelArg(tpl: TplComponent, vs: VariantSetting, argVar: Var) {
    return removeWhere(vs.args, (arg) => arg.param.variable === argVar);
  }

  setArg(tpl: TplComponent, vs: VariantSetting, argVar: Var, expr: Expr) {
    setTplComponentArg(tpl, vs, argVar, expr);
  }

  /**
   * This is not quite the same behavior as Figma.  In Figma, when you create a
   * new frame, its placement is based on where your viewport is currently
   * centered, vertically, and it finds the next available spot to the right of
   * anything along that center line.
   */
  addNewMixedArenaFrame(
    arena: Arena,
    name: string,
    component: Component,
    {
      viewMode,
      width = 800,
      height = 800,
      insertPt,
    }: {
      viewMode?: FrameViewMode;
      width?: number;
      height?: number;
      insertPt: Pt;
    }
  ) {
    const { top, left } = this.computeFrameInsertLoc(
      arena,
      width,
      height,
      insertPt
    );

    const arenaFrame = mkArenaFrame({
      site: this.site(),
      name,
      component,
      width,
      height,
      top,
      left,
      viewMode,
    });

    // Pin matching screen variants.
    const [gvs] = getPartitionedScreenVariants(this.site(), width);
    gvs.forEach((gv) => {
      arenaFrame.pinnedGlobalVariants[gv.uuid] = true;
    });

    ensureVariantSetting(arenaFrame.container, [this.site().globalVariant]);

    arena.children.push(arenaFrame);
    normalizeMixedArenaFrames(arena);
    return arenaFrame;
  }

  private computeFrameInsertLoc(
    arena: Arena,
    width: number,
    height: number,
    insertPt: Pt
  ) {
    const frames = ensureArrayOfInstances(arena.children, ArenaFrame).filter(
      (f) => f.top != null && f.left != null
    );
    const padding = DEFAULT_MARGIN_FOR_NEW_FRAMES;
    const { top, left } = findSpaceForRectSweepRight(
      width + padding,
      height,
      insertPt,
      frames as Rect[]
    );
    return { top, left: left + padding };
  }

  addExistingArenaFrame(arena: Arena | null, frame: ArenaFrame, insertPt: Pt) {
    if (!arena) {
      return;
    }

    const { top, left } = this.computeFrameInsertLoc(
      arena,
      frame.width,
      getFrameHeight(frame),
      insertPt
    );
    frame.top = top;
    frame.left = left;
    arena.children.push(frame);
    normalizeMixedArenaFrames(arena);
  }

  removeExistingArenaFrame(
    arena: Arena | ComponentArena,
    frame: ArenaFrame,
    opts: { pruneUnnamedComponent: boolean } = { pruneUnnamedComponent: true }
  ) {
    if (isMixedArena(arena)) {
      removeFromArray(arena.children, frame);
      normalizeMixedArenaFrames(arena);
      const component = frame.container.component;
      if (opts.pruneUnnamedComponent && isFrameComponent(component)) {
        // There shouldn't be any other reference to this component, since it's unnamed.
        this.removeComponent(component);
      }
    } else if (isComponentArena(arena)) {
      if (
        isGlobalVariantFrame(arena, frame) ||
        isSuperVariantFrame(arena, frame)
      ) {
        removeSuperOrGlobalVariantComponentFrame(arena, frame);
      } else {
        assert(
          isCustomComponentFrame(arena, frame),
          "Should remove variant frames by removing variants"
        );
        removeCustomComponentFrame(arena, frame);
      }
    }
  }

  addArena(name?: string) {
    const arenas = this.site().arenas;
    const arenaName = this.getUniqueArenaName(name);
    const arena = mkMixedArena(arenaName);
    arenas.push(arena);
    return arena;
  }

  removeArena(arena: Arena) {
    remove(this.site().arenas, arena);

    // Also remove all the unnamed components in the arena
    for (const frame of getArenaFrames(arena)) {
      if (
        isKnownArenaFrame(frame) &&
        isFrameComponent(frame.container.component)
      ) {
        this.removeComponent(frame.container.component);
      }
    }
  }

  removeComponent(component: Component) {
    this.removeComponentGroup([component]);
  }

  removeComponentGroup(
    comps: Component[],
    opts?: {
      convertPageHrefToCode?: boolean;
    }
  ) {
    for (const comp of comps) {
      if (isPageComponent(comp)) {
        removeReferencingLinks(this.site(), comp, opts);
      }
      if (isCodeComponent(comp)) {
        removeReferencingTypeInstances(this.site(), comp);

        if (comp.superComp) {
          remove(comp.superComp.subComps, comp);
          comp.superComp = null;
        }

        comp.subComps.forEach((c) => (c.superComp = null));
        comp.subComps = [];
      }

      // Assert that no component outside of `comps` references this component
      const referencingComps = getReferencingComponents(
        this.site(),
        comp
      ).filter((c) => !comps.includes(c));
      assert(
        referencingComps.length === 0,
        `Cannot delete ${getComponentDisplayName(
          comp
        )} because it is still referenced by ${referencingComps.map((c) =>
          getComponentDisplayName(c)
        )}`
      );
      remove(this.site().components, comp);

      // Remove dedicated arenas and focused frame arenas
      removeWhere(this.site().componentArenas, (it) => it.component === comp);
      removeWhere(this.site().pageArenas, (it) => it.component === comp);

      // Remove frames in mixed arenas for this component
      for (const arena of this.site().arenas) {
        for (const frame of [...getArenaFrames(arena)]) {
          if (frame.container.component === comp) {
            removeFromArray(arena.children, frame);
          }
        }
      }

      this.removeComponentFromDefaultComponents(comp);
    }

    const queries = comps.flatMap((c) => c.dataQueries);
    if (queries.length > 0) {
      this.clearReferencesToRemovedQueries(queries.map((q) => q.uuid));
    }
  }

  clearReferencesToRemovedQueries(removedQueries: string[] | string) {
    const removedQueriesArray = ensureArray(removedQueries);
    const removedQueriesSet = new Set(removedQueriesArray);
    const queryInvalidationExprs = findQueryInvalidationExprWithRefs(
      this.site(),
      removedQueriesArray
    );
    queryInvalidationExprs.forEach(({ expr }) => {
      expr.invalidationQueries = expr.invalidationQueries.filter(
        (key) => isString(key) || !removedQueriesSet.has(key.ref.uuid)
      );
    });
  }

  removeComponentFromDefaultComponents(component: Component) {
    Object.entries(this.site().defaultComponents).forEach(([kind, c]) => {
      if (c == component) {
        delete this.site().defaultComponents[kind];
      }
    });
  }

  addComponentToDefaultComponents(component: Component, kind: string) {
    if (!this.site().defaultComponents[kind]) {
      this.site().defaultComponents[kind] = component;
    }
  }

  removeComponentQuery(component: Component, query: ComponentDataQuery) {
    removeFromArray(component.dataQueries, query);
    this.clearReferencesToRemovedQueries(query.uuid);
  }

  renameArena(arena: Arena, name: string) {
    arena.name = this.getUniqueArenaName(name, arena);
  }

  addScreenSizeToPageArenas({ width, height }: FrameSize) {
    const insertionIndex = addScreenSizeToPageArenas({
      site: this.site(),
      width: width,
      height: height,
    });

    reorderPageArenaCols(this.site());

    return insertionIndex;
  }

  private getUniqueArenaName(name?: string, arenaToExclude?: Arena) {
    return uniqueName(
      this.site()
        .arenas.filter((a) => !arenaToExclude || a !== arenaToExclude)
        .map((a) => a.name),
      name || ARENA_CAP,
      { separator: " " }
    );
  }

  addComponent(
    {
      type,
      name = "",
      useFreeRoot = false,
      styles,
    }: {
      type: ComponentType;
      name?: string;
      useFreeRoot?: boolean;
      styles?: CSSProperties;
    } = { type: ComponentType.Frame }
  ) {
    // Scratch artboards default to free root container for now.
    if (name === "") {
      assert(
        type === ComponentType.Frame,
        "Expect unnamed component to be an artboard"
      );
      useFreeRoot = true;
    } else {
      assert(
        type !== ComponentType.Frame,
        "Expected named component to not be an artboard"
      );
    }

    const root = mkTplTagX("div", {});

    const validName = name;
    const component = mkComponent({
      name: name ? this.getUniqueComponentName(validName) : "",
      tplTree: root,
      type,
    });
    const baseVariant = getBaseVariant(component);
    const baseVs = mkVariantSetting({ variants: [baseVariant] });
    root.vsettings.push(baseVs);
    const rsh = RSH(baseVs.rs, root);

    if (useFreeRoot) {
      rsh.set("display", "block");
    } else {
      rsh.set("display", "flex");
      rsh.set("flex-direction", "column");
    }
    rsh.set("position", "relative");

    if (type === ComponentType.Page) {
      rsh.set("width", "stretch");
      rsh.set("height", "stretch");
      if (DEVFLAGS.pageLayout) {
        rsh.merge(CONTENT_LAYOUT_INITIALS);
      }
    } else if (type === ComponentType.Frame) {
      rsh.set("width", "stretch");
      rsh.set("height", "stretch");
    } else {
      rsh.set("width", "wrap");
      rsh.set("height", "wrap");
    }

    if (styles) {
      rsh.merge(styles);
    }

    if (type === ComponentType.Page) {
      const path = this.nameToPath(validName);

      component.pageMeta = mkPageMeta({
        path: this.getUniquePagePath(path),
        roleId: this.site().defaultPageRoleId,
      });

      const pageWrapper = this.site().pageWrapper;
      if (pageWrapper) {
        $$$(component.tplTree).append(mkTplComponent(pageWrapper, baseVariant));
      }
    }

    this.attachComponent(component);

    return component;
  }

  attachComponent(
    component: Component,
    originalComponent?: Component,
    originalComponentSite?: Site
  ) {
    // First track all the sub components
    for (const comp of [component, ...getSubComponents(component)]) {
      if (!this.site().components.includes(comp)) {
        this.site().components.push(comp);
      }

      trackComponentSite(comp, this.site());
    }

    // Then ensure dedicated arena for them, as creating arenas sometimes may result
    // in looking up owner site of a sub component
    for (const [comp, originalComp] of leftZip(
      [component, ...getSubComponents(component)],
      originalComponent
        ? [originalComponent, ...getSubComponents(originalComponent)]
        : []
    )) {
      this.ensureDedicatedArena(comp, originalComp, originalComponentSite);
    }

    if (isContextCodeComponent(component)) {
      this.site().globalContexts.push(
        mkTplComponent(component, this.site().globalVariant)
      );
    }
  }

  cloneComponent(component: Component, name: string, attachComponent: boolean) {
    const res = cloneComponent(component, name);
    this.ensureComponentUsesActiveScreenVariantGroup(res.component);

    if (isPageComponent(component)) {
      // Page meta
      const meta = ensure(
        component.pageMeta,
        "Expected page component to have page meta"
      );
      const newPageMeta = clonePageMeta(meta);
      newPageMeta.path = this.getUniquePagePath(meta.path);
      res.component.pageMeta = newPageMeta;

      // Metadata key-value
      res.component.metadata = { ...component.metadata };
    }

    if (attachComponent) {
      this.attachComponent(res.component, component);
    }

    return res;
  }

  clonePlumeComponent(
    plumeSite: Site | undefined,
    componentId: string,
    name: string,
    attachComponent: boolean
  ) {
    assert(plumeSite, `Could not load Plume site`);
    const plumeComponent = plumeSite.components.find(
      (c) => c.uuid === componentId
    );
    assert(
      plumeComponent,
      `Could not find Plume component named ${componentId}`
    );

    const { component } = cloneComponent(
      plumeComponent,
      this.getUniqueComponentName(name)
    );
    fixImageAssetRefsForClonedTemplateComponent(
      this,
      component,
      plumeSite.imageAssets
    );

    assert(
      plumeComponent.plumeInfo,
      "Missing plume info in a plume component!!!"
    );

    if (attachComponent) {
      this.attachComponent(component);

      const plugin = getPlumeEditorPlugin(component);
      plugin?.onComponentCreated?.(this.site(), plumeSite, component);

      if (!this.site().defaultComponents[plumeComponent.plumeInfo.type]) {
        this.site().defaultComponents[plumeComponent.plumeInfo.type] =
          component;
      }
    }
    return component;
  }

  renameComponent(component: Component, name: string) {
    const oldName = component.name;
    if (toClassName(name) !== toClassName(component.name)) {
      component.name = component.superComp
        ? this.getUniqueSubComponentName(component.superComp, name)
        : this.getUniqueComponentName(name);
    } else {
      component.name = name;
    }

    if (!oldName && name) {
      // If we're now giving a name to this Component, elevate it as a page
      // or "normal" component, and create the corresponding arena
      component.type = isPageComponent(component)
        ? ComponentType.Page
        : ComponentType.Plain;
      this.ensureDedicatedArena(component);
    }
  }

  private ensureDedicatedArena(
    component: Component,
    originalComponent?: Component,
    originalComponentSite?: Site
  ) {
    if (isFrameComponent(component) || isCodeComponent(component)) {
      // No dedicated arenas for scratch and code components
      return undefined;
    }
    const isPage = isPageComponent(component);
    if (isPage) {
      const pageArena = mkPageArena({
        component,
        site: this.site(),
      });
      this.site().pageArenas.push(pageArena);
      return pageArena;
    } else {
      const componentArenaSite = originalComponentSite || this.site();
      const originalComponentArenaAndSite = originalComponent
        ? [
            componentArenaSite,
            ...walkDependencyTree(componentArenaSite, "all").map(
              (dep) => dep.site
            ),
          ]
            .flatMap((site) =>
              site.componentArenas.map((arena) => ({ site, arena }))
            )
            .find(({ arena }) => arena.component === originalComponent)
        : undefined;
      const componentArena = mkComponentArena({
        site: this.site(),
        component,
        opts:
          originalComponent && originalComponentArenaAndSite
            ? deriveDefaultFrameSize(
                originalComponentArenaAndSite.site,
                originalComponent
              )
            : undefined,
      });
      this.site().componentArenas.push(componentArena);
      return componentArena;
    }
  }

  rebuildDedicatedArenas() {
    this.site().componentArenas = [];
    this.site().pageArenas = [];

    for (const comp of this.site().components) {
      this.ensureDedicatedArena(comp);
    }
  }

  convertComponentToPage(component: Component) {
    const path = this.nameToPath(component.name);
    component.pageMeta = mkPageMeta({
      path: this.getUniquePagePath(path),
    });
    component.type = ComponentType.Page;
    const root = component.tplTree;
    const sizingProps = [...SIZE_PROPS, "flex-grow", "flex-shrink", "overflow"];
    if (isTplVariantable(root)) {
      // Clear all the sizing settings that are irrelevant for
      // Page components
      for (const vs of root.vsettings) {
        const exp = RSH(vs.rs, root);
        for (const prop of sizingProps) {
          exp.clear(prop);
        }
      }
    }
    setPageSizeType(component as PageComponent, "stretch");

    // Turn all containing artboards into stretchy artboards
    for (const frame of getReferencingFrames(this.site(), component)) {
      frame.viewMode = FrameViewMode.Stretch;
    }

    const existingComponentArena = getComponentArena(this.site(), component);
    if (existingComponentArena) {
      removeFromArray(this.site().componentArenas, existingComponentArena);
    }

    /// Turn all public states into private states
    for (const state of component.states) {
      updateStateAccessType(this.site(), component, state, "private");
    }

    this.ensureDedicatedArena(component);
  }

  convertPageToComponent(component: Component) {
    if (isPageComponent(component)) {
      removeReferencingLinks(this.site(), component);
    }
    component.pageMeta = undefined;
    component.type = ComponentType.Plain;

    const existingPageArena = getPageArena(this.site(), component);
    if (existingPageArena) {
      removeFromArray(this.site().pageArenas, existingPageArena);
    }

    this.ensureDedicatedArena(component);
  }

  getUniqueComponentName(name?: string) {
    if (name && name.trim() === "") {
      return "";
    }
    const nameBase = (name || "Unnamed Component").trim();
    const existingNames = [
      ...this.site()
        .components.filter((c) => !isCodeComponent(c))
        .map((t) => t.name),
    ];
    return uniqueName(existingNames, nameBase, {
      separator: "",
      normalize: toClassName,
    });
  }

  getUniqueSubComponentName(superComp: Component, name: string) {
    const nameBase = (name || "Unnamed Component").trim();
    const existingNames = [...superComp.subComps.map((t) => t.name)];
    return uniqueName(existingNames, nameBase, {
      separator: "",
      normalize: toClassName,
    });
  }

  changePagePath(page: PageComponent, path: string) {
    assert(path.startsWith("/"), "Expected page path to start with /");
    const pageMeta = ensure(
      page.pageMeta,
      "Page component is expected to have pageMeta"
    );

    function cleanup() {
      // Remove dots after slashes.
      path = path.replace(/\/\.*/g, "/");
      // Remove characters that are not supported by file systems or
      // HTTP URIs.
      path = path.replace(/[<>:"\\|?*#]/g, "");
      // Replace more than one slash by just one slash.
      path = path.replace(/\/\/*/g, "/");
      // Remove trailing slash unless path === "/".
      if (path.endsWith("/") && path !== "/") {
        path = path.slice(0, -1);
      }
    }

    cleanup();

    // Path must only be /like/[this]/here, not /like-[this].here or /like[this]here.
    // Params must be entire route segments, not part of a route segment.
    // We auto insert slashes to break up things. If there are adjacent hyphens or periods, we just remove them.
    path = path
      .replace(/[-.]\[/g, "/[")
      .replace(/[^/[]\[/g, "/[")
      .replace(/\][^/]]/g, "]/")
      .replace(/\][-.]/g, "]/");

    cleanup();

    if (pageMeta.path == path) {
      return;
    }

    pageMeta.path = this.getUniquePagePath(path, page);

    const newParams = extractParamsFromPagePath(pageMeta.path);
    for (const existingParam of Object.keys(pageMeta.params)) {
      if (!newParams.includes(existingParam)) {
        delete pageMeta.params[existingParam];
      }
    }
    for (const param of newParams) {
      if (!pageMeta.params[param]) {
        pageMeta.params[param] = "value";
      }
    }
  }

  clonePage(page: Component, name: string, attachComponent: boolean) {
    const res = cloneComponent(page, name);
    const meta = ensure(
      page.pageMeta,
      "Expected page component to have page meta"
    );

    const newPageMeta = clonePageMeta(meta);
    newPageMeta.path = this.getUniquePagePath(meta.path);
    res.component.pageMeta = newPageMeta;

    if (attachComponent) {
      this.attachComponent(res.component);
    }

    return res;
  }

  /**
   * Normalize given name using kebab case and prepending slash.
   *
   * Examples:
   * - "ComponentName" -> "/component-name"
   * - "Parent Title/New Page" -> "/parent-title/new-page"
   * - "/valid-uri" -> "/valid-uri"
   */
  nameToPath(name: string): string {
    return "/" + trim(name, "/").split("/").map(kebabCase).join("/");
  }

  tryGetPageByPath(path: string): PageComponent | undefined {
    return this.getPageComponents().find((p) => p.pageMeta.path === path);
  }

  getPageComponents() {
    return this.site().components.filter(isPageComponent);
  }

  /**
   * This assumes that the path has gone through some normalization and cleanup!
   *
   * No trailing slashes, double slashes, [], etc.
   */
  getUniquePagePath(path: string, exclude?: PageComponent): string {
    const existingPaths = [
      ...this.getPageComponents()
        .filter((p) => exclude !== p)
        .map((c) => c.pageMeta.path),
    ];
    return uniquePagePath(path, existingPaths);
  }

  debugDumpTree(tpl: TplNode) {
    const indent = (amt: number, text: string) => `${repeat("  ", amt)}${text}`;
    const lines: string[] = [];
    walkTpls(tpl, {
      pre: (node, path) => {
        lines.push(indent(path.length, summarizeTpl(node)));
      },
    });
    return lines.join("\n");
  }

  describeArenaFrame(frame: ArenaFrame): string {
    const component = frame.container.component;
    if (component.name) {
      return component.name;
    } else if (frame.name) {
      return frame.name;
    } else {
      return `Unnamed ${FRAME_LOWER}`;
    }
  }

  addMixin(name?: string, mixin?: Mixin) {
    mixin =
      mixin ||
      new Mixin({
        name: this.getUniqueMixinName(name),
        rs: mkRuleSet({}),
        preview: undefined,
        uuid: mkShortId(),
        forTheme: false,
        variantedRs: [],
      });
    this.site().mixins.push(mixin);
    if (name) {
      this.renameMixin(mixin, name);
    }
    return mixin;
  }

  removeMixin(mixin: Mixin) {
    this.site().components.forEach((c) =>
      [...findVariantSettingsUnderTpl(c.tplTree)].forEach(([vs]) =>
        tryRemoveFromArray(vs.rs.mixins, mixin)
      )
    );
    removeFromArray(this.site().mixins, mixin);
  }

  renameMixin(mixin: Mixin, name: string) {
    if (toVarName(name) !== toVarName(mixin.name)) {
      mixin.name = this.getUniqueMixinName(name);
    } else {
      mixin.name = name;
    }
  }

  duplicateMixin(mixin: Mixin) {
    const newMixin = cloneMixin(mixin);
    newMixin.name = this.getUniqueMixinName(mixin.name);
    this.site().mixins.push(newMixin);
    return newMixin;
  }

  getUniqueMixinName(name?: string) {
    const existingNames = this.site().mixins.map((t) => t.name);
    return uniqueName(existingNames, name || `Unnamed ${MIXIN_CAP}`, {
      separator: " ",
      normalize: toVarName,
    });
  }

  addToken(opts: { name?: string; tokenType: TokenType; value?: string }) {
    const token = new StyleToken({
      name: this.getUniqueTokenName(opts.name),
      type: opts.tokenType,
      value: opts.value || "",
      uuid: mkShortId(),
      variantedValues: [],
      isRegistered: false,
      regKey: undefined,
    });
    this.site().styleTokens.push(token);
    return token;
  }

  renameToken(token: StyleToken, name: string) {
    if (toVarName(name) !== toVarName(token.name)) {
      token.name = this.getUniqueTokenName(name);
    } else {
      token.name = name;
    }
  }

  addImageAsset(opts: {
    name?: string;
    type: ImageAssetType;
    dataUri?: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
  }) {
    const existing = this.site().imageAssets.find(
      (asset) => asset.dataUri === opts.dataUri && asset.type === opts.type
    );
    if (existing) {
      return existing;
    }

    const asset = mkImageAsset({
      name: this.getUniqueImageAssetName(
        opts.name || (opts.type === ImageAssetType.Icon ? "icon" : "image")
      ),
      type: opts.type,
      dataUri: opts.dataUri,
      width: opts.width,
      height: opts.height,
      aspectRatio: opts.aspectRatio,
    });
    this.site().imageAssets.push(asset);
    return asset;
  }

  renameImageAsset(asset: ImageAsset, name: string) {
    if (toVarName(name) !== toVarName(asset.name)) {
      asset.name = this.getUniqueImageAssetName(name);
    } else {
      asset.name = name;
    }
  }

  getUniqueImageAssetName(name?: string) {
    const existingNames = this.site().imageAssets.map((t) => t.name);
    return uniqueName(existingNames, name || "image", {
      separator: " ",
      normalize: (s) => toVarName(s).toLowerCase(),
    });
  }

  removeImageAsset(asset: ImageAsset) {
    const usages = extractImageAssetUsages(this.site(), asset)[0];
    for (const usage of usages) {
      removeImageAssetUsage(asset, usage);
    }
    removeFromArray(this.site().imageAssets, asset);
  }

  renameVariant(variant: Variant, name?: string) {
    if (isStandaloneVariantGroup(variant.parent)) {
      this.renameVariantGroup(variant.parent!, name);
    } else {
      const group = ensureKnownVariantGroup(variant.parent);
      variant.name = this.getUniqueVariantName(group, name, variant);
    }
  }

  getUniqueVariantName(group: VariantGroup, name?: string, exclude?: Variant) {
    return uniqueName(
      group.variants
        .filter((v) => v !== exclude)
        .map((v) => v.name)
        .concat(["Base", ...reservedVariableNames]),
      name || `Unnamed ${VARIANT_OPTION_LOWER}`,
      { separator: " ", normalize: toVarName }
    );
  }

  renameVariantGroup(group: VariantGroup, name?: string) {
    const isStandalone = isStandaloneVariantGroup(group);

    if (group.type === VariantGroupType.Component) {
      const component = ensure(
        this.site().components.find((c) => c.variantGroups.includes(group)),
        "Expected some component to contain the given variant group"
      );
      this.renameParam(component, group.param, name || "Unnamed Group");
    } else {
      const newName = this.getUniqueGlobalVariantGroupName(name, group);
      group.param.variable.name = newName;
    }

    if (isStandalone) {
      group.variants[0].name = group.param.variable.name;
    }
  }

  getUniqueGlobalVariantGroupName(name?: string, exclude?: VariantGroup) {
    return uniqueName(
      this.site()
        .globalVariantGroups.filter((vg) => vg != exclude)
        .map((vg) => vg.param.variable.name)
        .concat(reservedVariableNames),
      name || "Unnamed Group",
      { normalize: toVarName }
    );
  }

  getUniqueParamName(component: Component, name?: string, exclude?: Param) {
    const existingNames = [
      ...this.getExistingTplAndParamNames(component, undefined, exclude),
      ...reservedVariableNames,
    ];
    return uniqueName(existingNames, name || "Unnamed Prop", {
      normalize: toVarName,
    });
  }

  getUniqueExplicitStateName(
    component: Component,
    name?: string,
    exclude?: State
  ) {
    return this.getUniqueParamName(
      component,
      name || "Unnamed State",
      exclude?.param
    );
  }

  renameParam(component: Component, param: Param, name: string) {
    const maybeState = component.states.find(
      (s) => s.param === param && !s.tplNode
    );

    const newName = maybeState
      ? this.getUniqueExplicitStateName(component, name, maybeState)
      : this.getUniqueParamName(component, name, param);
    renameParamAndFixExprs(this.site(), component, param, newName);

    if (maybeState?.onChangeParam) {
      const newOnChangeParamName = this.getUniqueExplicitStateName(
        component,
        genOnChangeParamName(newName),
        maybeState
      );
      renameParamAndFixExprs(
        this.site(),
        component,
        maybeState.onChangeParam,
        newOnChangeParamName
      );
    }
  }

  renameTpl(
    component: Component,
    tpl: TplNamable,
    name: string | null,
    tplTreeToFixExprs?: TplNode
  ) {
    const newName = !name?.trim()
      ? null
      : this.getUniqueTplName(component, name, tpl);
    renameTplAndFixExprs(this.site(), tpl, newName, tplTreeToFixExprs);
  }

  /**
   * Ensures that the subtree of `component` starting at `tpl` have "correct names"
   * that is, names that don't conflict with other elements of the component, and
   * for elements that should have a name but don't, assigns a name
   */
  ensureSubtreeCorrectlyNamed(component: Component, tpl: TplNode) {
    for (const descendant of flattenTpls(tpl)) {
      if (isTplNamable(descendant)) {
        let elementName: string | undefined = undefined;
        if (descendant.name) {
          elementName = descendant.name;
        } else if (
          isTplComponent(descendant) &&
          (descendant.component.alwaysAutoName ||
            descendant.component.states.some((s) => !isPrivateState(s)) ||
            (isTplCodeComponent(descendant) &&
              descendant.component.codeComponentMeta.hasRef))
        ) {
          elementName = getFolderComponentDisplayName(descendant.component);
        }
        if (elementName) {
          this.renameTpl(component, descendant, elementName, tpl);
        }
      }
    }
  }

  /** Tpl and param names cannot conflict with each other due to code generation conflicts. */
  getExistingTplAndParamNames(
    component: Component,
    nodeToExclude?: TplNamable,
    paramToExclude?: Param
  ) {
    return [
      ...this.getExistingTplNames(component, nodeToExclude),
      ...this.getExistingParamNames(component, paramToExclude),
    ];
  }

  getExistingTplNames(
    component: Component,
    nodeToExclude?: TplNamable
  ): string[] {
    return withoutNils(
      flattenTpls(component.tplTree)
        .filter(isTplNamable)
        .filter((n) => n !== nodeToExclude)
        .map((n) => n.name)
    );
  }

  getExistingParamNames(
    component: Component,
    paramToExclude?: Param
  ): string[] {
    return component.params
      .filter((p) => p !== paramToExclude)
      .map((p) => p.variable.name);
  }

  getUniqueTplName(
    component: Component,
    name: string,
    nodeToExclude?: TplNamable
  ) {
    const existingNames = [
      ...this.getExistingTplAndParamNames(component, nodeToExclude),
      ...reservedVariableNames,
    ];

    if (nodeToExclude && isComponentRoot(nodeToExclude)) {
      // Allow "root" only for root element
      removeFromArray(existingNames, "root");
    }
    return uniqueName(existingNames, name, { normalize: toVarName });
  }

  duplicateToken(token: StyleToken) {
    const newToken = cloneStyleToken(token);
    newToken.name = this.getUniqueTokenName(token.name);
    newToken.isRegistered = false;
    this.site().styleTokens.push(newToken);
    return newToken;
  }

  getUniqueTokenName(name?: string) {
    const existingNames = this.site().styleTokens.map((t) => t.name);
    return uniqueName(existingNames, name || "Unnamed Style Token", {
      separator: " ",
      normalize: toVarName,
    });
  }

  /**
   * @param reorderedChildren Can be an incomplete subset of tpl.children.
   * reorderedChildren will end up first, before the rest of tpl.children.
   */
  reorderChildren(tpl: TplTag, reorderedChildren: TplNode[]) {
    assert(
      xDifference(reorderedChildren, tpl.children).size === 0,
      "Reordered children should contain the same nodes as tpl.children"
    );
    tpl.children = uniq([...reorderedChildren, ...tpl.children]);
  }

  /**
   * Returns true if can link an attr of this TplTag or an arg of this
   * TplComponent to the containing component's props
   */
  canLinkToProp(tpl: TplTag | TplComponent) {
    // Cannot do so if tpl is defaultContents of a slot!
    if ($$$(tpl).ancestors().toArrayOfTplNodes().find(isTplSlot)) {
      return false;
    }
    return true;
  }

  canExtractComponent(tpl: TplNode) {
    return (
      !isComponentRoot(tpl) &&
      isTplTagOrComponent(tpl) &&
      !isTplColumn(tpl) &&
      !hasTextAncestor(tpl)
    );
  }

  cloneFrame(frame: ArenaFrame, attachComponent: boolean) {
    const newFrame = cloneArenaFrame(frame);
    if (isFrameComponent(frame.container.component)) {
      // For unnamed frames, we create a deep copy of the component
      const res = this.cloneComponent(
        frame.container.component,
        "",
        attachComponent
      );

      // We can just re-create the TplComponent instead of trying to preserve
      // the existing one, as an unnamed component can't have variants or args
      // and so couldn't be modified in any interesting way anyway.
      newFrame.container = mkTplComponent(
        res.component,
        this.site().globalVariant
      );

      // Fix up any other references to component variants in the frame.
      // Since this is an unnamed component, we only expect to see the base variant,
      // but will map anything just in case.
      newFrame.targetVariants = newFrame.targetVariants.map((v) =>
        ensure(
          res.oldToNewVariant.get(v),
          "Expected oldToNewVariant map to contain variant"
        )
      );
      const oldVariantsByUuid = keyBy(
        allComponentVariants(frame.container.component),
        (v) => v.uuid
      );
      for (const [key, val] of Object.entries(newFrame.pinnedVariants)) {
        delete newFrame.pinnedVariants[key];
        const prevVariant = oldVariantsByUuid[key];
        const newVariant = res.oldToNewVariant.get(prevVariant);
        if (newVariant) {
          newFrame.pinnedVariants[newVariant.uuid] = val;
        }
      }
    }
    ensureVariantSetting(newFrame.container, [this.site().globalVariant]);
    return newFrame;
  }

  extractToMixin(
    mixin: Mixin,
    styleNames: string[],
    fromExp: IRuleSetHelpersX,
    keepProps?: string[]
  ) {
    const mixinExp = new RuleSetHelpers(mixin.rs, "div");
    extractStyles(styleNames, fromExp, mixinExp, keepProps);
  }

  extractToVariant(
    tpl: TplNode,
    variant: Variant,
    styleNames: string[],
    fromExp: IRuleSetHelpersX,
    keepProps?: string[]
  ) {
    const vs = ensureVariantSetting(tpl, [variant]);
    const targetExp = RSH(vs.rs, tpl);
    extractStyles(styleNames, fromExp, targetExp, keepProps);
  }

  moveVariant(component: Component, variant: Variant, newGroup: VariantGroup) {
    assert(
      newGroup.type === VariantGroupType.Component,
      "Expected new variant group type to be VariantGroupType.Component"
    );
    assert(
      component.variantGroups.includes(newGroup),
      "Expected new variant group to be from given component"
    );
    if (variant.parent === newGroup) {
      return;
    }
    const oldParent = variant.parent;
    variant.selectors = undefined;
    variant.parent = newGroup;
    newGroup.variants.push(variant);

    // Make sure the name is unique in the new group
    this.renameVariant(variant, variant.name);

    if (oldParent) {
      // This is a normal non-style variant
      removeFromArray(oldParent.variants, variant);

      // Fix all existing references to this variant through TplComponent.args
      // to the new VariantGroup
      for (const [vs, tpl] of this.findAllVariantSettings({ ordered: false })) {
        if (isTplComponent(tpl)) {
          for (const arg of [...vs.args]) {
            if (arg.param === oldParent.param) {
              if (
                isKnownVariantsRef(arg.expr) &&
                arg.expr.variants.includes(variant)
              ) {
                // We just found TplComponent with a now-invalid arg reference for oldParent
                // to this variant, which is no longer a child of the oldParent!  Remove it
                // from this TplComponent's arg...
                const validVariants = arg.expr.variants.filter(
                  (v) => v !== variant
                );
                if (validVariants.length > 0) {
                  this.setArg(
                    tpl,
                    vs,
                    oldParent.param.variable,
                    mkVariantGroupArgExpr(validVariants)
                  );
                } else {
                  this.delArg(tpl, vs, oldParent.param.variable);
                }

                // And then, since this variant used to be activated for this TplComponent,
                // we activate it under the new group.
                const newArg = vs.args.find((x) => x.param === newGroup.param);
                const newExistingVal = maybeInstance(
                  maybe(newArg, (x) => x.expr),
                  VariantsRef
                );
                const newVal = newGroup.multi
                  ? [
                      variant,
                      ...(newExistingVal ? newExistingVal.variants : []),
                    ]
                  : [variant];
                this.setArg(
                  tpl,
                  vs,
                  newGroup.param.variable,
                  mkVariantGroupArgExpr(newVal)
                );
              }
            }
          }
        }
      }

      moveVariantCellInComponentArena(
        this.site(),
        component,
        variant,
        oldParent,
        newGroup
      );
    }
  }

  cloneVariant(component: Component, variant: Variant) {
    assert(!isBaseVariant(variant), "Can't clone base variant");
    const newVariant = cloneVariant(variant);
    if (variant.parent) {
      variant.parent.variants.push(newVariant);
      this.renameVariant(newVariant, newVariant.name);
    } else {
      assert(
        isStyleOrCodeComponentVariant(variant),
        "Variant with no parent is expected to be a registered variant"
      );
      component.variants.push(newVariant);
    }

    this.copyToVariant(component, variant, newVariant);
    return newVariant;
  }

  cloneVariantGroup(component: Component, variantGroup: VariantGroup) {
    const name = variantGroup.param.variable.name;
    const newName = this.getUniqueGlobalVariantGroupName(name, variantGroup);

    const newVariantGroup = this.createVariantGroup({
      component,
      optionsType: isStandaloneVariantGroup(variantGroup)
        ? VariantOptionsType.standalone
        : variantGroup.multi
        ? VariantOptionsType.multiChoice
        : VariantOptionsType.singleChoice,
      name: newName,
    });

    variantGroup.variants.forEach((_, index) =>
      this.copyToVariant(
        component,
        variantGroup.variants[index],
        newVariantGroup.variants[index]
      )
    );

    return newVariantGroup;
  }

  copyToVariant(
    component: Component,
    fromVariant: Variant,
    toVariant: Variant
  ) {
    for (const [vs, tpl] of findVariantSettingsUnderTpl(component.tplTree)) {
      if (!vs.variants.includes(fromVariant)) {
        continue;
      }

      const newCombo = ensureValidCombo(
        component,
        vs.variants
          .filter((v) => v !== toVariant)
          .map((v) => (v === fromVariant ? toVariant : v))
      );

      const newVs = cloneVariantSetting(vs);
      newVs.variants = newCombo;

      const existingVs = tryGetVariantSetting(tpl, newCombo);

      if (existingVs) {
        // If there's already an existing VariantSetting for the new combo, then we
        // need to do a merge.  We overwrite text and dataCond, but
        // merge attrs, args, mixins, styles.

        // We reverse the args array before running uniqBy and then reverse again
        // to preserve the order of args (uniqBy keeps the first encountered).
        existingVs.args = arrayReversed(
          uniqBy(
            arrayReversed([...existingVs.args, ...newVs.args]),
            (arg) => arg.param.variable.name
          )
        );
        existingVs.attrs = { ...existingVs.attrs, ...newVs.attrs };
        if (newVs.text || !isBaseVariant(toVariant)) {
          // If newVs.text is null and we're copying styles to base, we don't
          // want to override its existing `text` with null. That would make
          // invalid text tpl tags with no text in their base variant.
          existingVs.text = newVs.text;
        }
        if (newVs.dataCond || !isBaseVariant(toVariant)) {
          // This is similar to the text logic above. If we're copying styles
          // to base and newVs do not contain dataCond, we don't want to
          // override the existing baseVs.dataCond. That would make a
          // nonrendered element be rendered everywhere.
          existingVs.dataCond = newVs.dataCond
            ? clone(newVs.dataCond)
            : undefined;
        }
        existingVs.rs.mixins = uniq([
          ...existingVs.rs.mixins,
          ...newVs.rs.mixins,
        ]);
        const fromExp = RSH(newVs.rs, tpl);
        const toExp = RSH(existingVs.rs, tpl);
        for (const prop of fromExp.props()) {
          toExp.set(prop, fromExp.get(prop));
        }
      } else {
        tpl.vsettings.push(newVs);
      }
    }
    for (const tpl of flattenTpls(component.tplTree)) {
      // Fix text blocks: Cloning a variant setting for a text node may
      // produce new (cloned) TplTag nodes in NodeMarkers. Such TplTags
      // must be added to the node children and we need to ensure that
      // their parent pointers are correct.
      if (isTplTextBlock(tpl)) {
        fixTextChildren(tpl);
        reconnectChildren(tpl);
      }
    }
  }

  isOwnedBySite(
    thing: Component | Mixin | StyleToken | Theme | ImageAsset | TplNode
  ) {
    if (isKnownComponent(thing)) {
      return this.site().components.includes(thing);
    } else if (isKnownMixin(thing)) {
      return this.site().mixins.includes(thing);
    } else if (isKnownStyleToken(thing)) {
      return this.site().styleTokens.includes(thing);
    } else if (isKnownTheme(thing)) {
      return this.site().themes.includes(thing);
    } else if (isKnownImageAsset(thing)) {
      return this.site().imageAssets.includes(thing);
    } else if (isKnownTplNode(thing)) {
      const component = $$$(thing).tryGetOwningComponent();
      return component ? this.isOwnedBySite(component) : false;
    } else {
      throw new Error("Unexpected item type");
    }
  }

  findProjectDepOwner(
    thing: Component | Mixin | StyleToken | Theme | ImageAsset
  ): ProjectDependency | null {
    for (const dep of this.site().projectDependencies) {
      if (
        (isKnownComponent(thing) && dep.site.components.includes(thing)) ||
        (isKnownMixin(thing) && dep.site.mixins.includes(thing)) ||
        (isKnownStyleToken(thing) && dep.site.styleTokens.includes(thing)) ||
        (isKnownTheme(thing) && dep.site.themes.includes(thing)) ||
        (isKnownImageAsset(thing) && dep.site.imageAssets.includes(thing))
      ) {
        return dep;
      }
    }
    return null;
  }

  upgradeProjectDeps(targetDeps: ProjectDependency[]) {
    const site = this.site();
    const deps = targetDeps.map((targetDep) => {
      return {
        oldDep: ensure(
          site.projectDependencies.find((dep) => dep.pkgId === targetDep.pkgId),
          "Expected project dependencies to contain given targetDep"
        ),
        newDep: targetDep,
      };
    });
    upgradeProjectDeps(site, deps);
  }

  removeProjectDep(dep: ProjectDependency) {
    upgradeProjectDeps(this.site(), [{ oldDep: dep, newDep: undefined }]);
  }

  ensureScreenVariantsForFrames() {
    getSiteArenas(this.site()).forEach((arena) =>
      ensureActivatedScreenVariantsForArena(this.site(), arena)
    );
  }

  /**
   * Swaps all TplComponent for `fromComp` to use `toComp` instead. Does a
   * best-effort matching of activated variants and args purely by name.
   */
  swapComponents(fromComp: Component, toComp: Component) {
    const swapper = makeComponentSwapper(this.site(), fromComp, toComp);

    for (const comp of this.site().components) {
      if (comp === fromComp || comp === toComp) {
        continue;
      }

      for (const tpl of flattenComponent(comp)) {
        swapper(tpl, comp);
      }
    }
  }

  swapTokens(fromToken: StyleToken, toToken: StyleToken) {
    const site = this.site();
    const [usages] = extractTokenUsages(site, fromToken);
    for (const usage of usages) {
      changeTokenUsage(site, fromToken, usage, toToken);
    }
  }

  addGlobalVariantSplit(opts: {
    group: GlobalVariantGroup;
    variant: Variant;
    type: SplitType;
    status: SplitStatus;
  }) {
    const split = mkGlobalVariantSplit(opts);
    this.site().splits.push(split);
    return split;
  }

  removeSplit(split: Split) {
    remove(this.site().splits, split);
  }

  /**
   * This function is used to clean redundant overrides. It traverses the
   * tpl trees of all components looking for CSS rules and texts which are
   * the same in all variant settings. Such overrides are not needed and
   * could generate useless conditions in JS and useless media queries in CSS
   * in codegen step.
   *
   * Note that it doesn't do anything very smart to detect all useless
   * overrides; it removes only the obvious ones (the ones which have the same
   * value for *all* variant settings). If there is any variant setting with
   * a different value for a rule, that rule overrides will be kept for all
   * other variant settings (even if the override has the same value of
   * base).
   */
  cleanRedundantOverrides() {
    for (const component of this.site().components) {
      for (const tpl of flattenTpls(component.tplTree)) {
        const baseVs = ensureBaseVariantSetting(component, tpl);

        const baseStyles: Record<string, string> = {};
        const mayNeedStyleOverrides: Record<string, boolean> = {};
        for (const rule of Object.keys(baseVs.rs.values)) {
          baseStyles[rule] = baseVs.rs.values[rule];
          mayNeedStyleOverrides[rule] = false;
        }
        let mayNeedTextOverrides = false;

        const nonBaseVss = tpl.vsettings.filter(
          (vs) => !isBaseVariant(vs.variants)
        );

        for (const vs of nonBaseVss) {
          for (const rule of Object.keys(vs.rs.values)) {
            if (
              rule in mayNeedStyleOverrides &&
              baseStyles[rule] !== vs.rs.values[rule]
            ) {
              mayNeedStyleOverrides[rule] = true;
            }
          }

          if (vs.text && !instUtil.deepEquals(vs.text, baseVs.text)) {
            mayNeedTextOverrides = true;
          }
        }

        for (const vs of nonBaseVss) {
          vs.rs.values = pickBy(
            vs.rs.values,
            (rule) =>
              !(rule in mayNeedStyleOverrides) || mayNeedStyleOverrides[rule]
          );

          if (vs.text && !mayNeedTextOverrides) {
            vs.text = null;
          }
        }
      }
    }
  }

  lintElementVisibilities(opts: { performUpdates?: boolean }) {
    const { performUpdates } = opts;

    const changes: {
      component: Component;
      tpl: TplNode;
      variants: VariantCombo;
      variantSetting: VariantSetting;
      newVisibility: TplVisibility;
      oldVisibility: TplVisibility;
    }[] = [];

    const isScreenOrStyleVS = (vs: VariantSetting) =>
      hasScreenVariant(vs.variants) ||
      hasStyleOrCodeComponentVariant(vs.variants);

    for (const component of this.site().components) {
      for (const tpl of flattenComponent(component)) {
        const baseVs = ensureBaseVariantSetting(component, tpl);
        const baseVisibility = getVariantSettingVisibility(baseVs);

        const visibleVss = tpl.vsettings.filter(
          (vs) =>
            hasVisibilitySetting(vs) &&
            !isInvisible(getVariantSettingVisibility(vs))
        );

        // If base is invisible and some of the screen or style variants have a visible
        // visibility, then we use display: none as the invisible setting for all the
        // invisibles (otherwise, we use not-rendered). This is to ensure that styles
        // that are applied through media queries or css selectors still get applied
        const invisibilitySetting =
          isInvisible(baseVisibility) && visibleVss.some(isScreenOrStyleVS)
            ? TplVisibility.DisplayNone
            : TplVisibility.NotRendered;

        const invisibleVss = tpl.vsettings.filter(
          (vs) =>
            hasVisibilitySetting(vs) &&
            isInvisible(getVariantSettingVisibility(vs))
        );

        invisibleVss.forEach((vs) => {
          const oldVisibility = getVariantSettingVisibility(vs);
          const newVisibility =
            isScreenOrStyleVS(vs) && visibleVss.length > 0
              ? TplVisibility.DisplayNone
              : invisibilitySetting;

          if (newVisibility !== oldVisibility) {
            changes.push({
              component,
              tpl,
              variants: vs.variants,
              variantSetting: vs,
              newVisibility,
              oldVisibility,
            });

            if (performUpdates) {
              setTplVisibility(tpl, vs.variants, newVisibility);
            }
          }
        });
      }
    }

    return {
      changesByComponent: xGroupBy(changes, (c) => c.component),
      total: changes.length,
    };
  }

  findNestedLinks() {
    const result: {
      component: Component;
      baseLink: TplNode;
      tpl: TplNode;
    }[] = [];

    const isTplWithLink = (tpl: TplNode) =>
      (isTplTag(tpl) && tpl.tag === "a") ||
      (isTplComponent(tpl) && componentHasLink(tpl.component));

    const componentHasLink = memoize((component: Component) =>
      flattenTpls(component.tplTree).some(isTplWithLink)
    );

    const walkNestedLink = (component: Component, baseLink: TplNode) =>
      walkTpls(baseLink, {
        pre(tpl) {
          if (tpl !== baseLink && isTplWithLink(tpl)) {
            result.push({ component, baseLink, tpl });
          }
          return true;
        },
      });
    this.site().components.forEach((c) => {
      walkTpls(c.tplTree, {
        pre(tpl) {
          if (isTplTag(tpl) && tpl.tag === "a") {
            walkNestedLink(c, tpl);
            return false;
          }
          return true;
        },
      });
    });
    return result;
  }

  fixDuplicateTplIds() {
    for (const component of this.site().components) {
      const seen = new Map<string, TplNode>();
      for (const tpl of flattenComponent(component)) {
        if (seen.has(tpl.uuid)) {
          const prev = seen.get(tpl.uuid)!;
          console.log("Found existing tpl uuid", { component, prev, tpl });
          (tpl as any).uuid = mkShortId();
        }
        seen.set(tpl.uuid, tpl);
      }
    }
  }

  findInteractionByUuid(interactionUuid: string) {
    for (const component of this.site().components) {
      for (const tpl of flattenTpls(component.tplTree)) {
        for (const { eventHandlerKey, expr } of getAllEventHandlersForTpl(
          component,
          tpl
        )) {
          const interactions = isKnownEventHandler(expr)
            ? expr.interactions
            : [];
          for (const interaction of interactions) {
            if (interaction.uuid === interactionUuid) {
              return {
                component,
                tpl,
                eventHandlerKey,
                eventHandler: ensureKnownEventHandler(expr),
                interaction,
              };
            }
          }
        }
      }
    }
    return undefined;
  }
}

export function addEmptyQuery(
  component: Component,
  queryName: string = "query"
) {
  const query = new ComponentDataQuery({
    uuid: mkShortId(),
    name: toVarName(
      uniqueName(
        component.dataQueries.map((q) => q.name),
        queryName,
        {
          normalize: toVarName,
        }
      )
    ),
    op: undefined,
  });
  component.dataQueries.push(query);
  return query;
}
