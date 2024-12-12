import { siteCCVariantsToInfos } from "@/wab/shared/cached-selectors";
import { isTplRootWithCodeComponentVariants } from "@/wab/shared/code-components/variants";
import {
  arrayEqIgnoreOrder,
  assert,
  ensure,
  mapify,
  mkShortId,
  moveIndex,
  tuple,
  xAddAll,
} from "@/wab/shared/common";
import {
  ensureComponentArenaColsOrder,
  ensureComponentArenaRowsOrder,
} from "@/wab/shared/component-arenas";
import {
  allSuperComponentVariants,
  getNamespacedComponentName,
} from "@/wab/shared/core/components";
import {
  UNINITIALIZED_VALUE,
  allGlobalVariantGroups,
  getResponsiveStrategy,
  writeable,
} from "@/wab/shared/core/sites";
import { getPseudoSelector, mkRuleSet } from "@/wab/shared/core/styles";
import { isTplTag, summarizeTplTag } from "@/wab/shared/core/tpls";
import { ScreenSizeSpec, parseScreenSpec } from "@/wab/shared/css-size";
import {
  ArenaFrame,
  Arg,
  Component,
  ComponentVariantGroup,
  CustomCode,
  Expr,
  GlobalVariantGroup,
  GlobalVariantGroupParam,
  ObjectPath,
  Rep,
  Site,
  StateParam,
  TplNode,
  TplTag,
  Variant,
  VariantGroup,
  VariantGroupState,
  VariantSetting,
} from "@/wab/shared/model/classes";
import {
  FramePinManager,
  withoutIrrelevantScreenVariants,
} from "@/wab/shared/PinManager";
import { ResponsiveStrategy } from "@/wab/shared/responsiveness";
import { $$$ } from "@/wab/shared/TplQuery";
import { arrayContains } from "class-validator";
import L, { orderBy, uniqBy } from "lodash";
import type { OverrideProperties, SetNonNullable } from "type-fest";

export const BASE_VARIANT_NAME = "base";

export enum VariantGroupType {
  /* eslint-disable @typescript-eslint/no-shadow */
  Component = "component",
  GlobalScreen = "global-screen",
  GlobalUserDefined = "global-user-defined",
}

export type VariantCombo = Variant[];

export function mkVariant({
  name,
  selectors,
  parent,
  mediaQuery,
  description,
  forTpl,
  codeComponentName,
  codeComponentVariantKeys,
}: {
  name: string;
  selectors?: string[];
  parent?: VariantGroup;
  mediaQuery?: string | null;
  description?: string | null;
  forTpl?: TplNode | null;
  codeComponentName?: string | null;
  codeComponentVariantKeys?: string[] | null;
}) {
  return new Variant({
    uuid: mkShortId(),
    name,
    selectors,
    codeComponentName,
    codeComponentVariantKeys,
    parent,
    mediaQuery,
    description,
    forTpl,
  });
}

export function mkBaseVariant() {
  return mkVariant({ name: "base" });
}

export function isBaseVariant(variants: Variant | VariantCombo) {
  if (Array.isArray(variants)) {
    return variants.length === 1 && variants[0].name === BASE_VARIANT_NAME;
  }
  return variants.name === BASE_VARIANT_NAME;
}

export function canHaveStyleOrCodeComponentVariant(component: Component) {
  const tplRoot = component.tplTree;
  return isTplTag(tplRoot) || isTplRootWithCodeComponentVariants(tplRoot);
}

export function isStandaloneVariantGroup(
  group: VariantGroup | undefined | null
): boolean {
  return !!(
    group &&
    group.type !== VariantGroupType.GlobalUserDefined &&
    group.variants.length === 1 &&
    group.param.variable.name === group.variants[0].name
  );
}

export function isStandaloneVariant(variant: Variant) {
  if (variant.parent) {
    return isStandaloneVariantGroup(variant.parent);
  } else {
    return false;
  }
}

export function mkVariantSetting({
  variants,
  args,
  attrs,
  styles,
  dataCond,
  dataRep,
}: {
  variants: Variant[];
  args?: Array<Arg>;
  attrs?: Record<string, Expr>;
  styles?: Record<string, string>;
  dataCond?: CustomCode | ObjectPath;
  dataRep?: Rep;
}) {
  return new VariantSetting({
    variants,
    args: args ?? [],
    attrs: attrs ?? {},
    rs: mkRuleSet(
      styles
        ? {
            values: { ...styles },
          }
        : {}
    ),
    dataCond,
    dataRep,
    text: undefined,
    columnsConfig: undefined,
  });
}

export function mkGlobalVariantGroup({
  param,
  variants = [],
  multi = false,
  type,
}: {
  param: GlobalVariantGroupParam;
  variants?: Variant[];
  multi?: boolean;
  type: `${VariantGroupType.GlobalScreen | VariantGroupType.GlobalUserDefined}`;
}) {
  const g = new GlobalVariantGroup({
    uuid: mkShortId(),
    param,
    multi,
    variants,
    type,
  });
  g.variants.forEach((v) => (v.parent = g));
  return g;
}

export function mkComponentVariantGroup({
  param,
  variants = [],
  multi = false,
  linkedState,
}: {
  param: StateParam;
  variants?: Variant[];
  multi?: boolean;
  linkedState?: VariantGroupState;
}) {
  const g = new ComponentVariantGroup({
    uuid: mkShortId(),
    param,
    multi,
    variants,
    type: VariantGroupType.Component,
    linkedState: linkedState ?? UNINITIALIZED_VALUE,
  });
  g.variants.forEach((v) => (v.parent = g));
  if (linkedState) {
    writeable(g.linkedState).variantGroup = g;
  }
  return g;
}

type VariantWithSelectors = SetNonNullable<Variant, "selectors">;
export type CodeComponentVariant = SetNonNullable<
  Variant,
  "codeComponentName" | "codeComponentVariantKeys"
>;
/**
 * A style-only variant that applies to the whole component.
 */
export type ComponentStyleVariant = OverrideProperties<
  VariantWithSelectors,
  { forTpl: null | undefined }
>;

/**
 * A style-only variant that applies to a specific element.
 * Usually used with CSS pseudo-class selectors, though some selectors
 * (e.g. :focus-within) use JS for compatibility with old browsers.
 */
export type PrivateStyleVariant = SetNonNullable<
  VariantWithSelectors,
  "forTpl"
>;

/** Any style-only variant. */
export type StyleVariant = ComponentStyleVariant | PrivateStyleVariant;

export type StyleOrCodeComponentVariant = CodeComponentVariant | StyleVariant;

export function isStyleVariant(variant: Variant): variant is StyleVariant {
  return !!variant.selectors;
}

export function isCodeComponentVariant(
  variant: Variant
): variant is CodeComponentVariant {
  return !!variant.codeComponentName && !!variant.codeComponentVariantKeys;
}

export function isStyleOrCodeComponentVariant(
  variant: Variant
): variant is StyleOrCodeComponentVariant {
  return isStyleVariant(variant) || isCodeComponentVariant(variant);
}

export function isMaybeInteractiveCodeComponentVariant(
  variant: CodeComponentVariant
): boolean {
  const interactionKeywords = ["hover", "focus", "press"];
  return (
    isCodeComponentVariant(variant) &&
    variant.codeComponentVariantKeys.some((key) =>
      interactionKeywords.some((keyword) => key.toLowerCase().includes(keyword))
    )
  );
}

export function getStyleOrCodeComponentVariantIdentifierName(
  variant: StyleOrCodeComponentVariant
) {
  if (isCodeComponentVariant(variant)) {
    return "codeComponentVariantKeys";
  } else {
    return "selectors";
  }
}

export function hasStyleOrCodeComponentVariant(variantCombo: VariantCombo) {
  return variantCombo.some(isStyleOrCodeComponentVariant);
}

export function tryGetPrivateStyleVariant(variantCombo: VariantCombo) {
  const svs = variantCombo.filter((x) => isPrivateStyleVariant(x));
  assert(svs.length <= 1, "Must have at least one private style variant");
  return svs.length === 1 ? svs[0] : undefined;
}

export function isComponentStyleVariant(
  variant: Variant
): variant is ComponentStyleVariant {
  return isStyleVariant(variant) && !isPrivateStyleVariant(variant);
}

export function isPrivateStyleVariant(
  variant: Variant
): variant is PrivateStyleVariant {
  return isStyleVariant(variant) && !!variant.forTpl;
}

export function isGlobalVariant(variant: Variant) {
  if (!variant.parent) {
    return false;
  }
  return isGlobalVariantGroup(variant.parent);
}

export function isGlobalVariantGroup(
  group: VariantGroup
): group is GlobalVariantGroup {
  return group.type !== VariantGroupType.Component;
}

export function isScreenVariantGroup(group: VariantGroup) {
  return group.type === VariantGroupType.GlobalScreen;
}

export function isScreenVariant(variant: Variant) {
  return !!variant.parent && isScreenVariantGroup(variant.parent);
}

export function hasScreenVariant(variantCombo: Variant[]) {
  return variantCombo.some((v) => isScreenVariant(v));
}

export function hasNonScreenGlobalVariant(variantCombo: Variant[]) {
  return variantCombo.some((v) => !isScreenVariant(v));
}

export function getPartitionedScreenVariants(site: Site, width: number) {
  const active: Variant[] = [];
  const inactive: Variant[] = [];

  allGlobalVariantGroups(site, { includeDeps: "direct" })
    .filter(isScreenVariantGroup)
    .map((group) => group.variants)
    .flat()
    .forEach((variant) => {
      if (variant.parent !== site.activeScreenVariantGroup) {
        inactive.push(variant);
      } else {
        const isActive =
          variant.mediaQuery &&
          parseScreenSpec(variant.mediaQuery).match(width);
        if (isActive) {
          active.push(variant);
        } else {
          inactive.push(variant);
        }
      }
    });
  return tuple(active, inactive);
}

export function areEquivalentScreenVariants(
  variant1: Variant,
  variant2: Variant
) {
  const spec1 = parseScreenSpec(
    ensure(variant1.mediaQuery, "Must be a screen variant")
  );
  const spec2 = parseScreenSpec(
    ensure(variant2.mediaQuery, "Must be a screen variant")
  );

  return (
    (spec1.minWidth ?? 0) === (spec2.minWidth ?? 0) &&
    spec1.maxWidth === spec2.maxWidth
  );
}

export function getPartitionedScreenVariantsByTargetVariant(
  site: Site,
  targetVariant: Variant
) {
  const screenVariants = L.without(
    allGlobalVariantGroups(site, { includeDeps: "direct" })
      .filter(isScreenVariantGroup)
      .flatMap((g) => g.variants),
    targetVariant
  );

  if (!targetVariant.mediaQuery) {
    // Always include target variant as active
    return tuple([targetVariant], screenVariants);
  }

  const active: Variant[] = [targetVariant];
  const inactive: Variant[] = [];
  const targetSpec = parseScreenSpec(targetVariant.mediaQuery);
  for (const variant of screenVariants) {
    if (
      !variant.mediaQuery ||
      variant.parent !== site.activeScreenVariantGroup
    ) {
      inactive.push(variant);
    } else {
      const spec = parseScreenSpec(variant.mediaQuery);
      if (isInclusiveSpec(spec, targetSpec)) {
        active.push(variant);
      } else {
        inactive.push(variant);
      }
    }
  }
  return tuple(active, inactive);
}

/**
 * Returns true if spec2 is definitely covered by spec1
 */
export function isInclusiveSpec(spec1: ScreenSizeSpec, spec2: ScreenSizeSpec) {
  // We count min-width:0px as "unset"
  const isMinSet = (val: number | undefined): val is number =>
    val != null && val !== 0;
  const isMaxSet = (val: number | undefined): val is number => val != null;

  if (isMinSet(spec1.minWidth) && isMaxSet(spec1.maxWidth)) {
    // Both sides are set. Includes spec2 only if both sides of spec2 are
    // also set, and within the interval
    return (
      isMinSet(spec2.minWidth) &&
      isMaxSet(spec2.maxWidth) &&
      spec2.minWidth >= spec1.minWidth &&
      spec2.maxWidth <= spec1.maxWidth
    );
  } else if (isMinSet(spec1.minWidth)) {
    // Min is set.  Includes spec2 only if min is set and greater
    return isMinSet(spec2.minWidth) && spec2.minWidth >= spec1.minWidth;
  } else if (isMaxSet(spec1.maxWidth)) {
    // Max is set.  Includes spec2 only if max is set and smaller
    return isMaxSet(spec2.maxWidth) && spec2.maxWidth <= spec1.maxWidth;
  } else {
    return false;
  }
}

export function getClosestSatisfyingWidth(width: number, spec: ScreenSizeSpec) {
  if (spec.minWidth && width < spec.minWidth) {
    return spec.minWidth;
  } else if (spec.maxWidth && width > spec.maxWidth) {
    return spec.maxWidth;
  }
  return width;
}

export function getOrderedScreenVariants(site: Site, group: VariantGroup) {
  return getOrderedScreenVariantSpecs(site, group).map((x) => x.variant);
}

export function getOrderedScreenVariantSpecs(site: Site, group: VariantGroup) {
  assert(isScreenVariantGroup(group), "must be screen variant group");
  const variantSpecs = group.variants.map((v) => ({
    variant: v,
    screenSpec: v.mediaQuery
      ? parseScreenSpec(v.mediaQuery)
      : new ScreenSizeSpec(0, undefined),
  }));

  const strategy = getResponsiveStrategy(site);
  const isMobileFirst = strategy === ResponsiveStrategy.mobileFirst;

  return strategy === ResponsiveStrategy.unknown
    ? variantSpecs
    : orderBy(
        variantSpecs,
        (it) =>
          isMobileFirst ? it.screenSpec.minWidth : it.screenSpec.maxWidth,
        [isMobileFirst ? "asc" : "desc"]
      );
}

export function getPrivateStyleVariantsForTag(
  component: Component,
  tpl: TplTag
): PrivateStyleVariant[] {
  return component.variants
    .filter(isPrivateStyleVariant)
    .filter((v) => v.forTpl === tpl);
}

/**
 * Returns true if this variant.selectors has only ::pseudo selectors for the
 * target tpl. If isComponentRoot is true, non private variant is allowed.
 */
export function isPseudoElementVariantForTpl(
  variant: Variant,
  isComponentRoot: boolean
) {
  return (
    (isPrivateStyleVariant(variant) || isComponentRoot) &&
    isPseudoElementVariant(variant)
  );
}

export function isPseudoElementVariant(variant: Variant) {
  return (
    !!variant.selectors &&
    variant.selectors.length > 0 &&
    variant.selectors.some((sel) => sel.startsWith("::"))
  );
}

/**
 * Returns true if this variant.selectors has :disabled selector for the target
 * tpl. If isComponentRoot is true, non private variant is allowed.
 */
export function isDisabledPseudoSelectorVariantForTpl(
  variant: Variant,
  isComponentRoot: boolean
) {
  return (
    (isPrivateStyleVariant(variant) || isComponentRoot) &&
    isDisabledPseudoSelectorVariant(variant)
  );
}

export function isDisabledPseudoSelectorVariant(variant: Variant) {
  return (
    !!variant.selectors &&
    variant.selectors.length > 0 &&
    variant.selectors.some((sel) => sel === ":disabled")
  );
}

/**
 * Returns true if this variant.selectors has Private and some
 * ::pseudo selectors
 */
export function variantHasPrivatePseudoElementSelector(
  variant: Variant,
  selector?: string
) {
  return (
    isPrivateStyleVariant(variant) &&
    !!variant.selectors &&
    variant.selectors.some((sel) => {
      return selector ? sel === selector : sel.startsWith("::");
    })
  );
}

// Return [GlobalVariants, LocalVariants]
export function splitVariantCombo(variantCombo: VariantCombo) {
  return L.partition(variantCombo, isGlobalVariant);
}

export function getGlobalVariants(variantCombo: VariantCombo) {
  return variantCombo.filter((v) => isGlobalVariant(v));
}

export function getBaseVariant(component: Component) {
  return component.variants[0];
}

export function tryGetBaseVariantSetting(tpl: TplNode) {
  return tpl.vsettings.find((vs) => isBaseVariant(vs.variants));
}

export function ensureBaseVariantSetting(tpl: TplNode) {
  return ensure(tryGetBaseVariantSetting(tpl), "Tpl should have base variant");
}

export const unclearableBaseStyleProps = [
  "display",
  "position",
  "flex-direction",
];

export const DEFAULT_BASE_IGNORABLE_STYLES = mapify({
  position: "relative",
  display: "flex",
  "flex-direction": ["row", "column"],
});

export function isDefaultIgnorableStyleValue(key: string, value: string) {
  if (DEFAULT_BASE_IGNORABLE_STYLES.has(key)) {
    const defaultValue = DEFAULT_BASE_IGNORABLE_STYLES.get(key);

    if (
      (Array.isArray(defaultValue) && defaultValue.includes(value)) ||
      defaultValue === value
    ) {
      return true;
    }
  }
  return false;
}

function isVariantSettingClean(vs: VariantSetting) {
  return (
    vs.rs.mixins.length === 0 &&
    vs.args.length === 0 &&
    L.isEmpty(vs.attrs) &&
    L.isNil(vs.dataCond) &&
    L.isNil(vs.dataRep) &&
    L.isNil(vs.text)
  );
}

export function isVariantSettingEmptyExcludingDefaultIgnorableStyles(
  vs: VariantSetting
) {
  if (!isBaseVariant(vs.variants)) {
    return isVariantSettingEmpty(vs);
  }
  const filteredValuesCount = Object.entries(vs.rs.values).filter(
    ([key, value]) => !isDefaultIgnorableStyleValue(key, value)
  ).length;

  return filteredValuesCount === 0 && isVariantSettingClean(vs);
}
export function isVariantSettingEmpty(vs: VariantSetting) {
  return Object.keys(vs.rs.values).length === 0 && isVariantSettingClean(vs);
}

export function clearVariantSetting(vs: VariantSetting) {
  vs.rs.values = {};
  vs.rs.mixins = [];
  vs.args = [];
  vs.attrs = {};
  vs.dataCond = null;
}

/**
 * Returns Set of VariantGroups that the argument set of Variants belong to
 */
export function getReferencedVariantGroups(
  variants: Iterable<Variant>
): Set<VariantGroup> {
  const vgs = new Set<VariantGroup>();
  for (const variant of variants) {
    if (variant.parent) {
      vgs.add(variant.parent);
    }
  }
  return vgs;
}

export function tryGetVariantSetting(tpl: TplNode, v: Variant[]) {
  if (v.length === 0) {
    return tryGetBaseVariantSetting(tpl);
  } else {
    return tpl.vsettings.find((vs) => arrayEqIgnoreOrder(vs.variants, v));
  }
}

export function addingBaseToTplWithExistingBase(
  tpl: TplNode,
  variants: Variant[] | Variant
) {
  return (
    tpl.vsettings.length > 0 &&
    tpl.vsettings.some((vs) => isBaseVariant(vs.variants)) &&
    isBaseVariant(variants)
  );
}

export function allVariantsInGroup(vg: VariantGroup) {
  return [...vg.variants];
}

export function ensureVariantSetting(tpl: TplNode, variants: Variant[]) {
  let vs = tryGetVariantSetting(tpl, variants);
  const rootTpl = $$$(tpl).root().maybeOneTpl();
  if (rootTpl) {
    ensureBaseRuleVariantSetting(tpl, variants, rootTpl);
  }
  if (!vs) {
    vs = mkVariantSetting({ variants });
    assert(
      !addingBaseToTplWithExistingBase(tpl, variants),
      "Cannot add base vs to tpl that already has base vs"
    );
    tpl.vsettings.push(vs);
  }
  return vs;
}

export function isHookTriggeredStyleVariant(styleVariant: StyleVariant) {
  return styleVariant.selectors
    .map(getPseudoSelector)
    .some((sel) => sel?.trigger?.alwaysByHook);
}

/**
 * Returns true of the argument variant is a "base rule variant".  Here, the "base"
 * has nothing to do with "base variant"; instead, it is referring to the "base css rule".
 * If you have a variant combo, the css rule you generate will look something like
 *   .blahblah:hover:focused
 *
 * The ".blahblah" is a VariantSetting composed of "base rule variants".  These variants
 * are either non-style, or they are style variants that must be triggered by react hooks.
 */
export function isBaseRuleVariant(variant: Variant) {
  if (isScreenVariant(variant)) {
    // screen variant will be triggered via media query
    return false;
  }
  if (isCodeComponentVariant(variant)) {
    // code component variant will be triggered via code component interactions
    return false;
  }
  if (isStyleVariant(variant) && !isHookTriggeredStyleVariant(variant)) {
    // a style variant that doesn't have to be triggered by js will just
    // be triggered by css selectors instead
    return false;
  }
  return true;
}

export function ensureBaseRuleVariantSetting(
  tpl: TplNode,
  variantCombo: VariantCombo,
  rootTpl: TplNode
) {
  if (variantCombo.some((v) => !isBaseRuleVariant(v))) {
    // If there's any variant that's not a "base rule" variant, then we need to
    // ensure the subset of variants that are the base rule variants have a
    // corresponding VariantSetting.
    // That's because the "base rules" version of the VariantSetting
    // is used for code-gen, and we wouldn't want to be creating it at code-gen
    // time; we want that setting to be created and saved at the same time that _this_
    // variant setting is created.
    const baseRuleVariants = variantCombo.filter(isBaseRuleVariant);
    if (baseRuleVariants.length !== variantCombo.length) {
      ensureVariantSetting(tpl, baseRuleVariants);
    }

    // We also need to use the nonstyle combo on the root tpl, which is what will
    // trigger the style variant (unless it's a private style variant)
    ensureVariantSetting(
      rootTpl,
      variantCombo.filter(
        (v) => !isStyleOrCodeComponentVariant(v) && !isScreenVariant(v)
      )
    );
  }
}

export function variantComboKey(combo: VariantCombo) {
  return combo
    .map((v) => v.uuid)
    .sort()
    .join("-");
}

export function ensureValidCombo(component: Component, combo: VariantCombo) {
  if (!isBaseVariant(combo)) {
    combo = combo.filter((v) => !isBaseVariant(v));
    combo = uniqBy(combo, (v) => {
      /**
       * Handle the following cases:
       * 1. Variant that doesn't have a parent (e.g. style variants like :hover)
       * 2. Standalone variant groups (e.g variants that are the only variant in a group / toggle variants)
       * 3. Multi variant groups
       *
       * In all these cases, we can just use the variant uuid as the key, since any combination of these
       * would be allowed in the combo
       */
      if (!v.parent || isStandaloneVariantGroup(v.parent) || v.parent.multi) {
        return v.uuid;
      }
      // This means that we are dealing with a single choice variant group
      // We can only have one variant from a single choice variant group
      // So we can just use the parent uuid as the key,
      return v.parent.uuid;
    });
  }
  if (combo.length === 0) {
    combo = [getBaseVariant(component)];
  }
  return combo;
}

export function isValidComboForToken(combo: VariantCombo) {
  // The Studio UI and codegen only support varianted tokens with 1 variant.
  return combo.length === 1;
}

/**
 * Return style variants whose selectors are all active
 */
export function getImplicitlyActivatedStyleVariants(
  variants: Variant[],
  activeVariants: Set<Variant>,
  tpl: TplNode | undefined | null
) {
  const activeRootSelectors = new Set<string>();
  const activePrivateSelectors = new Set<string>();

  for (const variant of activeVariants) {
    if (!isStyleOrCodeComponentVariant(variant)) {
      continue;
    }

    if (isComponentStyleVariant(variant)) {
      xAddAll(activeRootSelectors, variant.selectors);
    } else if (
      isPrivateStyleVariant(variant) &&
      tpl &&
      variant.forTpl === tpl
    ) {
      xAddAll(activePrivateSelectors, variant.selectors);
    }
  }

  const newActivatedVariants = new Set<Variant>();
  for (const variant of variants) {
    if (!isStyleOrCodeComponentVariant(variant)) {
      continue;
    }
    if (
      isPrivateStyleVariant(variant) &&
      tpl &&
      variant.forTpl === tpl &&
      variant.selectors?.every((sel) => activePrivateSelectors.has(sel))
    ) {
      newActivatedVariants.add(variant);
    } else if (
      !isPrivateStyleVariant(variant) &&
      variant.selectors?.every((sel) => activeRootSelectors.has(sel))
    ) {
      newActivatedVariants.add(variant);
    }
  }
  return newActivatedVariants;
}

export function getAllVariantsForTpl({
  component,
  tpl,
  site,
  includeSuperVariants,
}: {
  component: Component;
  tpl: TplNode | null | undefined;
  site: Site;
  includeSuperVariants?: boolean;
}) {
  return component
    ? [
        ...component.variants.filter(isCodeComponentVariant),
        ...component.variants.filter((v) => isComponentStyleVariant(v)),
        ...component.variants.filter(
          (v) => tpl && isPrivateStyleVariant(v) && v.forTpl === tpl
        ),
        ...component.variantGroups.flatMap((group) => group.variants),
        ...(includeSuperVariants && component.superComp
          ? allSuperComponentVariants(component.superComp)
          : []),
        ...site.globalVariantGroups.flatMap((group) => group.variants),
        ...site.projectDependencies.flatMap((dep) =>
          dep.site.globalVariantGroups.flatMap((group) => group.variants)
        ),
      ]
    : [];
}

export function getDisplayVariants({
  site,
  frame,
  isPageArena,
  focusedTag,
}: {
  site: Site;
  frame: ArenaFrame;
  isPageArena?: boolean;
  includeGroupName?: boolean;
  focusedTag?: TplTag;
}) {
  const pinManager = new FramePinManager(site, frame);
  const activeVariants = pinManager.activeNonBaseVariants();

  // Don't display screen variants unless they are being targeted, or if
  // the component is screen variant aware
  const displayVariants = withoutIrrelevantScreenVariants({
    site,
    isPageArena,
    component: frame.container.component,
    activeVariants,
    targetedVariants: pinManager.selectedVariants(),
  });

  return displayVariants.map((variant) => ({
    displayName: makeVariantName({
      variant,
      focusedTag: isPrivateStyleVariant(variant) ? focusedTag : undefined,
      site,
    }),
    isSelected: pinManager.isSelected(variant),
    variant,
  }));
}

export function isFrameWithVariantCombo({
  site,
  frame,
}: {
  site: Site;
  frame: ArenaFrame;
}) {
  return getDisplayVariants({ site, frame }).length > 1;
}

export function getStyleOrCodeComponentVariantDisplayNames(
  variant: StyleOrCodeComponentVariant,
  site?: Site
) {
  if (isCodeComponentVariant(variant)) {
    const info = site && siteCCVariantsToInfos(site).get(variant);
    if (info) {
      return [...info.keysToMetas.values()].map((meta) => meta.displayName);
    }
  }
  if (isStyleVariant(variant)) {
    return variant.selectors.map(
      (sel) => getPseudoSelector(sel)?.displayName ?? sel
    );
  }
  return [];
}

export function makeStyleOrCodeComponentVariantName(
  variant: StyleOrCodeComponentVariant,
  site?: Site
) {
  return getStyleOrCodeComponentVariantDisplayNames(variant, site).join(", ");
}

export function makeVariantName({
  variant,
  focusedTag,
  superComp,
  site,
}: {
  variant: Variant;
  focusedTag?: TplTag;
  includeGroupName?: boolean;
  superComp?: Component;
  site?: Site;
}) {
  return (
    (isPrivateStyleVariant(variant)
      ? [
          focusedTag ? focusedTag.name || summarizeTplTag(focusedTag) : "",
          makeStyleOrCodeComponentVariantName(variant, site),
        ]
          .filter(Boolean)
          .join(": ")
      : isStyleOrCodeComponentVariant(variant)
      ? makeStyleOrCodeComponentVariantName(variant, site)
      : superComp
      ? `${getNamespacedComponentName(superComp)} • ${variant.name}`
      : variant.name) || "UnnamedVariant"
  );
}

/**
 * Returns true if we should generate code for this variant setting
 */
export function isActiveVariantSetting(site: Site, vs: VariantSetting) {
  // For now, a VariantSetting is inactive if it includes a screen variant
  // that is not the active screen variant group for the site
  return vs.variants.every(
    (v) => !isScreenVariant(v) || v.parent === site.activeScreenVariantGroup
  );
}

export function moveVariantGroup({
  site,
  component,
  fromIndex,
  toIndex,
}: {
  site: Site;
  component: Component;
  fromIndex: number;
  toIndex: number;
}) {
  moveIndex(component.variantGroups, fromIndex, toIndex);
  ensureComponentArenaRowsOrder(site, component);
}

export function moveVariant({
  site,
  component,
  variantGroup,
  fromIndex,
  toIndex,
}: {
  site: Site;
  component: Component;
  variantGroup: VariantGroup;
  fromIndex: number;
  toIndex: number;
}) {
  moveIndex(variantGroup.variants, fromIndex, toIndex);
  ensureComponentArenaColsOrder(site, component, variantGroup);
}

export function removeTplVariantSettings(tpl: TplNode, v: Variant[]) {
  const i = tpl.vsettings.findIndex((vs) => arrayEqIgnoreOrder(vs.variants, v));
  if (i !== -1) {
    tpl.vsettings.splice(i, 1);
  }
}

export function removeTplVariantSettingsContaining(tpl: TplNode, v: Variant[]) {
  tpl.vsettings = tpl.vsettings.filter((vs) => !arrayContains(vs.variants, v));
}

export function getActiveVariantSettings(
  tpl: TplNode,
  activeVariants: Variant[] | Set<Variant>
) {
  const isActive = Array.isArray(activeVariants)
    ? (v: Variant) => activeVariants.includes(v)
    : (v: Variant) => activeVariants.has(v);

  return tpl.vsettings.filter((vs) =>
    vs.variants.every((v) => isBaseVariant(v) || isActive(v))
  );
}
