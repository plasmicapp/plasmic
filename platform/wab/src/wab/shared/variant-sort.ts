import {
  assert,
  ensure,
  partitions,
  sortByKeys,
  xIndexMap,
} from "@/wab/shared/common";
import { getSuperComponents } from "@/wab/shared/core/components";
import { parseScreenSpec } from "@/wab/shared/css-size";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import {
  Component,
  Site,
  Variant,
  VariantGroup,
  VariantSetting,
} from "@/wab/shared/model/classes";
import {
  VariantCombo,
  getBaseVariant,
  getOrderedScreenVariants,
  isBaseVariant,
  isCodeComponentVariant,
  isGlobalVariant,
  isPrivateStyleVariant,
  isScreenVariant,
  isScreenVariantGroup,
  isStyleVariant,
} from "@/wab/shared/Variants";
import L from "lodash";

// See https://coda.io/d/Plasmic-Wiki_dHQygjmQczq/Targeting-Multiple-Component-Variants_suH6g#_luNNY

export type VariantComboSorter = (combo: VariantCombo) => VariantComboRank;
type VariantComboRank = [
  number, // # of private style selectors
  number, // private selector rank if only one selector, else 0
  number, // # of comp style selectors
  number, // selector rank if only one selector, else 0
  number, // # of comp variants
  number, // sum of comp variant ranks
  number, // # of global variants
  number // sum of global variant ranks
];

export function sortedVariantCombos(
  combos: VariantCombo[],
  sorter: VariantComboSorter
) {
  return sortByKeys(combos, sorter);
}

export function sortedVariantSettings(
  vsettings: VariantSetting[],
  sorter: VariantComboSorter
) {
  return sortByKeys(vsettings, (vs) => sorter(vs.variants));
}

/**
 * Returns true if maybeAncestorCombo is an "ancestor" of combo.  This is the case if
 * every non-style variant in maybeAncestorCombo is also in combo, and every style variant
 * in maybeAncestorCombo is an ancestor of some style variant in combo.
 *
 * For example,
 * - [primary] is an ancestor combo of [primary, small]
 * - [primary, :hover] is an ancestor combo of [primary, small, :hover:active]
 */
// TODO: Test this in variant-sort.spec.ts. Also update it to registered variants
export function isAncestorCombo(
  combo: VariantCombo,
  maybeAncestorCombo: VariantCombo
) {
  if (isBaseVariant(maybeAncestorCombo)) {
    return true;
  } else {
    return maybeAncestorCombo.every((v) => {
      if (combo.includes(v)) {
        return true;
      } else if (isStyleVariant(v)) {
        return combo.some(
          (cv) => isStyleVariant(cv) && isAncestorStyleVariant(cv, v)
        );
      } else if (isScreenVariant(v)) {
        return combo.some(
          (cv) => isScreenVariant(cv) && isAncestorScreenVariant(cv, v)
        );
      } else {
        return false;
      }
    });
  }
}

/**
 * Returns true if maybeAncestorStyleVariant is an ancestor style variant of styleVariant.
 * Both are assumed to be style variants.
 *
 * An ancestor style variant is a variant with strictly fewer selectors.  So for example,
 *
 *   :hover is an ancestor of :hover:focused
 *   :hover:focused is an ancestor of :hover:focused:pressed
 *
 *   :hover:disabled is NOT an ancestor of :hover:pressed
 *
 * So every selector of the ancestor must show up as a selector of the descendant.
 *
 * Furthermore, if they are private style variants, they must be for the same tpl.
 */
export function isAncestorStyleVariant(
  styleVariant: Variant,
  maybeAncestorStyleVariant: Variant
) {
  return (
    styleVariant.forTpl === maybeAncestorStyleVariant.forTpl &&
    ensure(maybeAncestorStyleVariant.selectors, "Must be style variant")
      .length > 0 &&
    ensure(maybeAncestorStyleVariant.selectors, "Must be style variant").every(
      (s) => ensure(styleVariant.selectors, "Must be style variant").includes(s)
    )
  );
}

/**
 * Returns true if maybeAncestorScreenVariant is an ancestor screen variant of
 * screenVariant.
 *
 * An ancestor screen variant is a screen variant with a media query that
 * fits the media query of a variant. So for example, in a desktop-first
 * responsive breakpoints setup, tablet (max_width: X) is an ancestor of
 * mobile (max_width: Y < X).
 */
export function isAncestorScreenVariant(
  screenVariant: Variant,
  maybeAncestorScreenVariant: Variant
) {
  const spec = parseScreenSpec(
    ensure(screenVariant.mediaQuery, "Must be screen variant")
  );
  const maybeAncestorSpec = parseScreenSpec(
    ensure(maybeAncestorScreenVariant.mediaQuery, "Must be screen variant")
  );
  return (
    (!spec.minWidth ||
      !maybeAncestorSpec.minWidth ||
      spec.minWidth >= maybeAncestorSpec.minWidth) &&
    (!spec.maxWidth ||
      !maybeAncestorSpec.maxWidth ||
      spec.maxWidth <= maybeAncestorSpec.maxWidth)
  );
}

/**
 * Filters down the list of VariantSettings by only those that are relevant
 * given the activeCombo, and returns them in sorted order
 */
export function sortedVariantSettingStack(
  vsettings: VariantSetting[],
  activeCombo: VariantCombo,
  sorter: VariantComboSorter
) {
  // Only keep vsettings that are ancestors of the current combo
  vsettings = vsettings.filter((vs) =>
    isAncestorCombo(activeCombo, vs.variants)
  );
  return sortedVariantSettings(vsettings, sorter);
}

export function getDependentVariantSettings(
  vsettings: VariantSetting[],
  combo: VariantCombo,
  ignorePrivateStyleVariants = true
) {
  const filteredCombo = ignorePrivateStyleVariants
    ? combo.filter((v) => !isPrivateStyleVariant(v))
    : combo;
  return vsettings.filter((vs) => isAncestorCombo(vs.variants, filteredCombo));
}

const sortedGlobalVariants = (site: Site, group: VariantGroup) => {
  if (isScreenVariantGroup(group)) {
    return getOrderedScreenVariants(site, group);
  } else {
    return group.variants;
  }
};

const compareGlobalVariantGroup = (vg_a: VariantGroup, vg_b: VariantGroup) =>
  isScreenVariantGroup(vg_a) != isScreenVariantGroup(vg_b)
    ? isScreenVariantGroup(vg_a)
      ? -1
      : 1
    : 0;

export const makeGlobalVariantComboSorter = maybeComputedFn(
  function makeGlobalVariantComboSorter(site: Site) {
    const globalVariantRanks = xIndexMap([
      ...site.projectDependencies.flatMap((dep) =>
        dep.site.globalVariantGroups
          .sort(compareGlobalVariantGroup)
          .flatMap((vg) => sortedGlobalVariants(site, vg))
      ),
      ...site.globalVariantGroups
        .slice()
        .sort(compareGlobalVariantGroup)
        .flatMap((vg) => sortedGlobalVariants(site, vg)),
    ]);
    function makeKey(combo: VariantCombo) {
      return [combo.length, L.sum(combo.map((v) => globalVariantRanks.get(v)))];
    }
    return makeKey as VariantComboSorter;
  }
);

export const makeVariantComboSorter = maybeComputedFn(
  function makeVariantComboSorter(site: Site, component: Component) {
    const componentVariantRanks = xIndexMap([
      getBaseVariant(component),
      ...component.variantGroups.flatMap((vg) => vg.variants),
      ...getSuperComponents(component).flatMap((superComp) =>
        superComp.variantGroups.flatMap((g) => g.variants)
      ),
    ]);
    const globalVariantRanks = xIndexMap([
      ...site.projectDependencies.flatMap((dep) =>
        dep.site.globalVariantGroups.flatMap((vg) =>
          sortedGlobalVariants(site, vg)
        )
      ),
      ...site.globalVariantGroups.flatMap((vg) =>
        sortedGlobalVariants(site, vg)
      ),
    ]);
    function makeKey(combo: VariantCombo) {
      const [
        privateStyleVariants,
        compStyleVariants,
        codeComponentVariants,
        compVariants,
        globalVariants,
      ] = partitionVariants(component, combo, true);
      assert(
        privateStyleVariants.length <= 1,
        "can only have one private style variant in a combo"
      );
      return [
        L.sum(privateStyleVariants.map((v) => v.selectors?.length)),
        getOnlyStyleVariantSelectorRank(privateStyleVariants),
        L.sum(compStyleVariants.map((v) => v.selectors?.length)),
        getOnlyStyleVariantSelectorRank(compStyleVariants),
        compVariants.length,
        L.sum(compVariants.map((v) => componentVariantRanks.get(v))),
        globalVariants.length,
        L.sum(globalVariants.map((v) => globalVariantRanks.get(v))),
      ];
    }
    return makeKey as VariantComboSorter;
  }
);

export function partitionVariants(
  component: Component,
  variants: Variant[],
  ensureBase?: boolean
) {
  const [
    privateStyleVariants,
    compStyleVariants,
    codeComponentVariants,
    compVariants,
    globalVariants,
  ] = partitions(variants, [
    isPrivateStyleVariant,
    isStyleVariant,
    isCodeComponentVariant,
    (v) => !isGlobalVariant(v),
  ]);

  if (ensureBase) {
    const baseVariant = getBaseVariant(component);
    if (!compVariants.includes(baseVariant)) {
      compVariants.push(baseVariant);
    }
  }

  return [
    privateStyleVariants,
    compStyleVariants,
    codeComponentVariants,
    compVariants,
    globalVariants,
  ];
}

function getOnlyStyleVariantSelectorRank(styleVariants: Variant[]) {
  if (styleVariants.length !== 1) {
    return 0;
  }
  const variant = styleVariants[0];
  if (variant.selectors?.length !== 1) {
    return 0;
  }

  return getSelectorRank(variant.selectors[0]);
}

// Ranked selector from low to high;
// see https://app.shortcut.com/plasmic/story/19352/enforce-some-implicit-style-variant-ordering
const SELECTOR_RANK = [
  "Link",
  "Visited",
  "Hover",
  "Focused",
  "Focus Visible",
  "Focused Within",
  "Focus Visible Within",
  "Pressed",
  "Disabled",
  "Placeholder",
];
function getSelectorRank(selector: string) {
  const normed = selector.startsWith("Not ")
    ? selector.replace("Not ", "")
    : selector;
  const index = SELECTOR_RANK.indexOf(normed);
  return index >= 0 ? index : -1;
}

/**
 * Returns the screen variants sorted by the less restrictive order.
 * If it's a desktop-first responsive breakpoints setup, we will order the variants
 * by increasingly mediaQuery. And the opposite if it's a mobile-first setup.
 *
 * So for example, in a desktop-first responsive breakpoints setup, tablet (max_width: Z)
 * and mobile (max_width: Y, Y < Z). If we evaluate the styles for a screen with width X, X < Y < Z,
 *  we will want to apply the styles of the mobile variant. This way, we just need to find the first
 * screen variant in the sorted array that fits the screen width evaluated.
 */
export function sortedScreenVariants(screenVariants: Variant[]) {
  const [maxWidthScreenVariants, minWidthScreenVariants] = L.partition(
    screenVariants,
    (v) =>
      parseScreenSpec(ensure(v.mediaQuery, "Must be screen variant"))
        .maxWidth !== undefined
  );

  maxWidthScreenVariants.sort((a, b) =>
    isAncestorScreenVariant(a, b) ? -1 : 1
  );
  minWidthScreenVariants.sort((a, b) =>
    isAncestorScreenVariant(a, b) ? -1 : 1
  );

  return [...maxWidthScreenVariants, ...minWidthScreenVariants];
}
