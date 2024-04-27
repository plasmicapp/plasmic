import {
  Arena,
  ArenaChild,
  ArenaFrame,
  ArenaFrameCell,
  ArenaFrameGrid,
  ArenaFrameParams,
  ArenaFrameRow,
  Component,
  ComponentArena,
  ensureKnownArenaFrame,
  isKnownArena,
  isKnownArenaFrame,
  isKnownComponentArena,
  isKnownPageArena,
  isKnownVariant,
  PageArena,
  Site,
  Variant,
  VariantGroup,
} from "@/wab/classes";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  assert,
  ensure,
  last,
  mkShortId,
  pairwise,
  switchType,
} from "@/wab/common";
import { arrayReversed, removeFromArray } from "@/wab/commons/collections";
import {
  allComponentVariants,
  isPageComponent,
  isPageFrame,
} from "@/wab/components";
import { Pt } from "@/wab/geom";
import { ArenaType, arenaTypes } from "@/wab/shared/ApiSchema";
import {
  deriveDefaultFrameSize,
  ensureActivatedScreenVariantsForComponentArena,
  ensureActivatedScreenVariantsForCustomCell,
  ensureComponentArenaFrameSizeForTargetScreenVariant,
  getCellKeyForFrame,
  getComponentArenaBaseFrameViewMode,
  getComponentArenaRowLabel,
  getCustomFrameForActivatedVariants,
  isCustomComponentFrame,
  isStretchyComponentFrame,
  makeComponentArenaFrame,
  removeFramesFromComponentArenaForVariants,
  removeManagedFramesFromComponentArenaForVariantGroup,
  syncComponentArenaFrameSize,
} from "@/wab/shared/component-arenas";
import { parseScreenSpec, ScreenSizeSpec } from "@/wab/shared/Css";
import { COMBINATIONS_CAP } from "@/wab/shared/Labels";
import { ContainerLayoutType } from "@/wab/shared/layoututils";
import {
  getPageArenaRowLabel,
  makePageArenaFrame,
  removeManagedFramesFromPageArenaForVariantGroup,
  removeManagedFramesFromPageArenaForVariants,
  syncPageArenaFrameSize,
} from "@/wab/shared/page-arenas";
import { FramePinManager } from "@/wab/shared/PinManager";
import { ResponsiveStrategy } from "@/wab/shared/responsiveness";
import { isStretchyComponent } from "@/wab/shared/sizingutils";
import {
  ensureValidCombo,
  getBaseVariant,
  getClosestSatisfyingWidth,
  getDisplayVariants,
  getPartitionedScreenVariants,
  getPartitionedScreenVariantsByTargetVariant,
  isScreenVariant,
} from "@/wab/shared/Variants";
import {
  allGlobalVariants,
  getAllSiteFrames,
  getComponentArena,
  getFrameContainerType,
  getPageArena,
  getResponsiveStrategy,
  getSiteArenas,
  getSiteScreenSizes,
} from "@/wab/sites";
import { capitalizeFirst } from "@/wab/strs";
import { clone, mkTplComponent } from "@/wab/tpls";
import { has, isArray, isEmpty, keyBy, orderBy } from "lodash";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { IObservableValue, observable } from "mobx";

export type AnyArena = Arena | ComponentArena | PageArena;

export interface IArenaFrame extends ArenaFrame {
  // Auto-sized value, doesn't need to exist in the model.
  // That's important not only to avoid saving a new revision whenever opening
  // a large project, but also to avoid broadcasting updates to all sessions
  // when having multi-player editing (which causes all sessions to lookup the
  // newest changes).
  _height?: IObservableValue<number>;
}

export function mkMixedArena(name: string, children: ArenaChild[] = []) {
  return new Arena({
    children,
    name,
  });
}

export function mkArenaFrame({
  site,
  name,
  component,
  width,
  height,
  viewportHeight,
  top,
  left,
  viewMode,
  targetVariants = [],
  pinnedVariants = {},
  targetGlobalVariants = [],
  pinnedGlobalVariants = {},
}: {
  site: Site;
  name: string;
  component: Component;
  width: number;
  height: number;
  viewportHeight?: number;
  top?: number;
  left?: number;
  viewMode?: FrameViewMode;
  targetVariants?: Variant[];
  pinnedVariants?: ArenaFrameParams["pinnedVariants"];
  pinnedGlobalVariants?: ArenaFrameParams["pinnedGlobalVariants"];
  targetGlobalVariants?: ArenaFrameParams["targetGlobalVariants"];
}) {
  return new ArenaFrame({
    name,
    uuid: mkShortId(),
    container: mkTplComponent(component, site.globalVariant),
    height,
    viewportHeight,
    width,
    top,
    left,
    lang: "English",
    pinnedVariants: pinnedVariants,
    targetVariants: targetVariants.length
      ? targetVariants
      : [getBaseVariant(component)],
    pinnedGlobalVariants,
    targetGlobalVariants,
    viewMode: viewMode || FrameViewMode.Stretch,
    bgColor: null,
  });
}

export function isArenaType(x: string | null | undefined): x is ArenaType {
  if (!x) {
    return false;
  } else {
    return (arenaTypes as readonly string[]).includes(x);
  }
}

/**
 * Gets an arena's type.
 *
 * The pair of `getArenaType` and `getArenaUuidOrName` uniquely identifies an arena.
 */
export function getArenaType(arena: AnyArena): ArenaType {
  return switchType(arena)
    .when(Arena, () => "custom" as const)
    .when([ComponentArena, PageArena], (v) =>
      isKnownComponentArena(v) ? ("component" as const) : ("page" as const)
    )
    .result();
}

/**
 * Gets an arena's component's UUID, or its name if a custom arena.
 *
 * The pair of `getArenaType` and `getArenaUuidOrName` uniquely identifies an arena.
 */
export function getArenaUuidOrName(arena: AnyArena) {
  return switchType(arena)
    .when(Arena, (it) => it.name)
    .when(PageArena, (it) => it.component.uuid)
    .when(ComponentArena, (it) => it.component.uuid)
    .result();
}

export function getArenaName(arena: AnyArena) {
  return switchType(arena)
    .when(Arena, (it) => it.name)
    .when(PageArena, (it) => it.component.name)
    .when(ComponentArena, (it) => it.component.name)
    .result();
}

/**
 * Sets a focused frame for a dedicated arena.
 *
 * If `fromFocusedFrame` is passed in, its variant settings will be copied to the focused frame.
 * Otherwise, the base variant settings will be used.
 */
export function setFocusedFrame(
  site: Site,
  arena: DedicatedArena,
  fromFocusedFrame?: ArenaFrame
) {
  const { width, height } =
    arena.component.type === "page"
      ? getSiteScreenSizes(site)[0]
      : deriveDefaultFrameSize(site, arena.component);
  const newFocusedFrame = cloneArenaFrame(
    fromFocusedFrame || getArenaFrames(arena)[0]
  );
  newFocusedFrame.name = "";
  newFocusedFrame.width = width;
  newFocusedFrame.height = height;
  newFocusedFrame.viewportHeight = height;
  newFocusedFrame.top = 0;
  newFocusedFrame.left = 0;
  newFocusedFrame.viewMode = FrameViewMode.Stretch;
  arena._focusedFrame = newFocusedFrame;
  return newFocusedFrame;
}

/** An ArenaFrame with top/left positioning. */
export type PositionedArenaFrame = ArenaFrame & {
  top: number;
  left: number;
};

export function getPositionedArenaFrames(arena: Arena): PositionedArenaFrame[] {
  return arena.children as PositionedArenaFrame[];
}

export function getArenaFrames(
  arena: AnyArena | null | undefined
): ArenaFrame[] {
  return switchType(arena)
    .when(Arena, (it) => it.children)
    .when(ComponentArena, (it) =>
      it._focusedFrame
        ? [it._focusedFrame]
        : [
            ...getArenaFramesInGrid(it.matrix),
            ...getArenaFramesInGrid(it.customMatrix),
          ]
    )
    .when(PageArena, (it) =>
      it._focusedFrame
        ? [it._focusedFrame]
        : [
            ...getArenaFramesInGrid(it.matrix),
            ...getArenaFramesInGrid(it.customMatrix),
          ]
    )
    .elseUnsafe(() => []);
}

export const getArenaFrameDesc = (
  arena: AnyArena,
  arenaFrame: ArenaFrame,
  site: Site
) =>
  switchType(arena)
    .when(
      ComponentArena,
      () =>
        getDisplayVariants({
          site: site,
          frame: arenaFrame,
          isPageArena: false,
        })
          .map((it) => capitalizeFirst(it.displayName))
          .join(" + ") || "Base"
    )
    .when(Arena, () => {
      const artboardName =
        arenaFrame.name ||
        arenaFrame.container.component.name ||
        "Unnamed artboard";

      const variants = getDisplayVariants({
        site: site,
        frame: arenaFrame,
        isPageArena: false,
      })
        .map((it) => capitalizeFirst(it.displayName))
        .join(" + ");

      return variants ? `${artboardName} (${variants})` : artboardName;
    })
    .elseUnsafe(() => "");

export function getArenaFramesInGrid(grid: ArenaFrameGrid) {
  return getArenaFrameCellsInGrid(grid).map((cell) => cell.frame);
}

export function getArenaFrameCellsInGrid(grid: ArenaFrameGrid) {
  return grid.rows.flatMap((row) => row.cols.map((cell) => cell));
}

export function getArenaContaining(
  site: Site,
  frame: ArenaFrame
): AnyArena | undefined {
  return getSiteArenas(site).find((arena) =>
    getArenaFrames(arena).includes(frame)
  );
}

export function cloneArenaFrame(frame: ArenaFrame) {
  // Explicitly specify fields rather than use ...frame so that if fields get
  // added, we are forced to explicitly update this function and determine what
  // requires deep-cloning.
  const { name, lang, width, height, viewportHeight, top, left, container } =
    frame;

  return new ArenaFrame({
    name,
    uuid: mkShortId(),
    lang,
    width,
    height,
    viewportHeight,
    top,
    left,
    container: clone(container),
    pinnedVariants: { ...frame.pinnedVariants },
    targetVariants: frame.targetVariants.slice(0),
    pinnedGlobalVariants: { ...frame.pinnedGlobalVariants },
    targetGlobalVariants: frame.targetGlobalVariants.slice(0),
    viewMode: frame.viewMode,
    bgColor: frame.bgColor,
  });
}

export function cloneArena(arena: Arena) {
  return new Arena({
    name: arena.name,
    children: arena.children.map((c) =>
      cloneArenaFrame(ensureKnownArenaFrame(c))
    ),
  });
}

export enum FrameViewMode {
  Stretch = "stretch",
  Centered = "centered",
}

export function isHeightAutoDerived(
  arenaFrame: ArenaFrame
): arenaFrame is IArenaFrame {
  return (
    isPageComponent(arenaFrame.container.component) ||
    isStretchyComponentFrame(arenaFrame)
  );
}

export function updateAutoDerivedFrameHeight(
  arenaFrame: IArenaFrame,
  newHeight: number
) {
  const minHeight = isPageFrame(arenaFrame)
    ? arenaFrame.viewportHeight ?? 0
    : getFrameContainerType(arenaFrame) === ContainerLayoutType.free
    ? arenaFrame.height
    : 0;
  const height = Math.max(newHeight, minHeight);
  if (!arenaFrame._height) {
    arenaFrame._height = observable.box(height);
  }

  arenaFrame._height.set(height);
}

export function deriveInitFrameSettings(
  site: Site,
  arena: Arena,
  component: Component
): { viewMode?: FrameViewMode; width?: number; height?: number } {
  if (isPageComponent(component) || isStretchyComponent(component)) {
    // We guess that this is a full-screen component
    const lastStretchFrame = arrayReversed(
      arena.children.filter((x): x is ArenaFrame => isKnownArenaFrame(x))
    ).find((frame) => frame.viewMode === FrameViewMode.Stretch);
    return {
      viewMode: FrameViewMode.Stretch,
      width: lastStretchFrame ? lastStretchFrame.width : undefined,
      height: lastStretchFrame ? getFrameHeight(lastStretchFrame) : undefined,
    };
  } else {
    // For non-screen components, we just "guess" a size of 300x300 for now
    return {
      viewMode: FrameViewMode.Centered,
      width: 800,
      height: 500,
    };
  }
}

export function removeVariantsFromArenas(
  site: Site,
  variants: Variant[],
  component: Component | undefined
) {
  if (component) {
    if (isPageComponent(component)) {
      const arena = getPageArena(site, component);
      if (arena) {
        removeManagedFramesFromPageArenaForVariants(arena, variants);
      }
    } else {
      const arena = getComponentArena(site, component);
      if (arena) {
        removeFramesFromComponentArenaForVariants(arena, variants);
      }
    }
    for (const subComp of component.subComps) {
      removeVariantsFromArenas(site, variants, subComp);
    }
  } else {
    // For global variants, we need to remove from all arenas
    for (const arena of site.componentArenas) {
      removeFramesFromComponentArenaForVariants(arena, variants);
    }
    for (const arena of site.pageArenas) {
      removeManagedFramesFromPageArenaForVariants(arena, variants);
    }
  }

  // Next, remove references to these variants from leftover frames
  for (const frame of getAllSiteFrames(site)) {
    const pinnedVariants = component
      ? frame.pinnedVariants
      : frame.pinnedGlobalVariants;
    const targetVariants = component
      ? frame.targetVariants
      : frame.targetGlobalVariants;
    for (const variant of variants) {
      if (has(pinnedVariants, variant.uuid)) {
        delete pinnedVariants[variant.uuid];
      }
      if (targetVariants.includes(variant)) {
        removeFromArray(targetVariants, variant);
      }
    }
  }
}

export function removeVariantGroupFromArenas(
  site: Site,
  group: VariantGroup,
  component: Component | undefined
) {
  if (component) {
    if (isPageComponent(component)) {
      const arena = getPageArena(site, component);
      if (arena) {
        removeManagedFramesFromPageArenaForVariantGroup(arena, group);
      }
    } else {
      const arena = getComponentArena(site, component);
      if (arena) {
        removeManagedFramesFromComponentArenaForVariantGroup(arena, group);
      }
    }
    for (const subComp of component.subComps) {
      removeVariantGroupFromArenas(site, group, subComp);
    }
  } else {
    for (const arena of site.componentArenas) {
      removeManagedFramesFromComponentArenaForVariantGroup(arena, group);
    }
    for (const arena of site.pageArenas) {
      removeManagedFramesFromPageArenaForVariantGroup(arena, group);
    }
  }
  removeVariantsFromArenas(site, group.variants, component);
}

export function isPageArena(
  arena: AnyArena | null | undefined
): arena is PageArena {
  return isKnownPageArena(arena);
}

export function isComponentArena(
  arena: AnyArena | null | undefined
): arena is ComponentArena {
  return isKnownComponentArena(arena);
}

export function isMixedArena(
  arena: AnyArena | null | undefined
): arena is Arena {
  return isKnownArena(arena);
}

/**
 * Updates a mixed arena's frames to ensure that the min top/left of all frames
 * is at (0, 0). Returns the delta change in min top/left, if any.
 *
 * The canvas assumes the min top/left is at (0, 0) to set the clipper bounds.
 */
export function normalizeMixedArenaFrames(arena: Arena) {
  const frames = getPositionedArenaFrames(arena);

  let minTop = Infinity;
  let minLeft = Infinity;
  for (const frame of frames) {
    if (frame.top < minTop) {
      minTop = frame.top;
    }
    if (frame.left < minLeft) {
      minLeft = frame.left;
    }
  }

  if (minLeft === 0 && minTop === 0) {
    return null;
  }

  const delta = new Pt(-minLeft, -minTop);
  for (const frame of frames) {
    frame.top += delta.y;
    frame.left += delta.x;
  }
  return delta;
}

/**
 * Get the size of a mixed arena.
 *
 * Only works for mixed arenas where we use absolute positioning.
 */
export function getMixedArenaSize(arena: Arena): Pt {
  const frames = getPositionedArenaFrames(arena);
  if (frames.length === 0) {
    return Pt.zero();
  }

  let maxRight = -Infinity;
  let maxBottom = -Infinity;
  for (const frame of frames) {
    const right = frame.left + frame.width;
    const bottom = frame.top + getFrameHeight(frame);
    if (right > maxRight) {
      maxRight = right;
    }
    if (bottom > maxBottom) {
      maxBottom = bottom;
    }
  }

  return new Pt(maxRight, maxBottom);
}

/** A dedicated arena for a page or component. */
export type DedicatedArena = PageArena | ComponentArena;

/** A dedicated arena for a page or component, in focused mode. */
export type FocusedDedicatedArena = DedicatedArena & {
  _focusedFrame: ArenaFrame;
};

export function isDedicatedArena(
  arena: AnyArena | null | undefined
): arena is DedicatedArena {
  return isKnownPageArena(arena) || isKnownComponentArena(arena);
}

export function isFocusedDedicatedArena(
  arena: AnyArena
): arena is FocusedDedicatedArena {
  return isDedicatedArena(arena) && !!arena._focusedFrame;
}

export function getActivatedVariantsForFrame(site: Site, frame: ArenaFrame) {
  const component = frame.container.component;
  const variants = new Set([
    ...frame.targetGlobalVariants,
    ...frame.targetVariants,
  ]);

  if (!isEmpty(frame.pinnedVariants)) {
    const uuidToVariant = keyBy(allComponentVariants(component), (v) => v.uuid);
    for (const [key, pin] of Object.entries(frame.pinnedVariants)) {
      if (pin) {
        variants.add(
          ensure(
            uuidToVariant[key],
            "Pinned local variant missing from local variants"
          )
        );
      }
    }
  }

  if (!isEmpty(frame.pinnedGlobalVariants)) {
    const uuidToVariant = keyBy(
      allGlobalVariants(site, { includeDeps: "direct" }),
      (v) => v.uuid
    );
    for (const [key, pin] of Object.entries(frame.pinnedGlobalVariants)) {
      if (pin) {
        variants.add(
          ensure(
            uuidToVariant[key],
            "Pinned global variant missing from global variants"
          )
        );
      }
    }
  }

  return new Set(ensureValidCombo(component, [...variants]));
}

export function isPositionManagedFrame(
  studioCtx: StudioCtx,
  frame: ArenaFrame
) {
  return studioCtx.focusedMode || (frame.left == null && frame.top == null);
}

export function ensurePositionManagedFrame(frame: ArenaFrame) {
  frame.left = null;
  frame.top = null;
}

export function isDuplicatableFrame(arena: AnyArena, frame: ArenaFrame) {
  if (isComponentArena(arena)) {
    return isCustomComponentFrame(arena, frame);
  } else if (isPageArena(arena)) {
    return false;
  }

  return true;
}

export function ensureCustomFrameForActivatedVariants(
  site: Site,
  arena: ComponentArena | PageArena,
  variants: Set<Variant>
) {
  const existing = getCustomFrameForActivatedVariants(arena, variants);
  if (existing) {
    return existing;
  }

  const combo = ensureValidCombo(arena.component, [...variants]);
  assert(combo.length > 0, `Must be a valid combo`);
  const { width, height } = isPageComponent(arena.component)
    ? getSiteScreenSizes(site)[0]
    : deriveDefaultFrameSize(site, arena.component);

  const frame = isPageComponent(arena.component)
    ? makePageArenaFrame(site, arena.component, [...combo], width, height)
    : makeComponentArenaFrame({
        site,
        component: arena.component,
        variants: [...combo],
        width,
        height,
        viewMode: getComponentArenaBaseFrameViewMode(arena),
      });
  if (arena.customMatrix.rows.length === 0) {
    arena.customMatrix.rows.push(
      new ArenaFrameRow({ cols: [], rowKey: undefined })
    );
  }
  const cell = new ArenaFrameCell({ frame, cellKey: combo });
  arena.customMatrix.rows[0].cols.push(cell);

  ensureActivatedScreenVariantsForCustomCell(site, cell);

  const targetScreenVariant = combo.find((v) => isScreenVariant(v));
  if (targetScreenVariant) {
    resizeFrameForScreenVariant(site, frame, targetScreenVariant);
  }

  return frame;
}

export function ensureActivatedScreenVariantsForArena(
  site: Site,
  arena: AnyArena
) {
  if (isComponentArena(arena)) {
    ensureActivatedScreenVariantsForComponentArena(site, arena);
  } else {
    for (const frame of getArenaFrames(arena)) {
      ensureActivatedScreenVariantsForFrameByWidth(site, frame);
    }
  }
}

export function ensureActivatedScreenVariantsForFrameByWidth(
  site: Site,
  frame: ArenaFrame
) {
  const [active, inactive] = getPartitionedScreenVariants(site, frame.width);
  const pinManager = new FramePinManager(site, frame);
  for (const variant of active) {
    pinManager.activateVariant(variant);
  }
  for (const variant of inactive) {
    pinManager.deactivateVariant(variant);
  }
}

export function getDerivedScreenVariantsForFrame(
  site: Site,
  arena: AnyArena,
  frame: ArenaFrame
) {
  if (isComponentArena(arena)) {
    const cellKey = getCellKeyForFrame(arena, frame);
    if (isKnownVariant(cellKey) && isScreenVariant(cellKey)) {
      return getPartitionedScreenVariantsByTargetVariant(site, cellKey);
    } else if (isArray(cellKey)) {
      const screenVariants = cellKey.filter(isScreenVariant);
      if (screenVariants.length > 0) {
        return getPartitionedScreenVariantsByTargetVariant(
          site,
          screenVariants[0]
        );
      }
    }
    return [];
  }

  return getPartitionedScreenVariants(site, frame.width);
}

export function syncArenaFrameSize(
  site: Site,
  arena: AnyArena,
  frame: ArenaFrame
) {
  if (isComponentArena(arena)) {
    syncComponentArenaFrameSize(arena, frame);
  } else if (isPageArena(arena)) {
    syncPageArenaFrameSize(site, arena, frame);
  }
}

export function ensureFrameSizeForTargetScreenVariant(
  site: Site,
  arena: AnyArena,
  variant: Variant
) {
  assert(
    isScreenVariant(variant),
    "Trying to resize frame to something that is not a valid screen variant"
  );
  if (isComponentArena(arena)) {
    ensureComponentArenaFrameSizeForTargetScreenVariant(site, arena, variant);
  } else {
    for (const frame of getArenaFrames(arena)) {
      maybeResizeFrameForTargetScreenVariant(site, frame, variant);
    }
  }
}

export function maybeResizeFrameForTargetScreenVariant(
  site: Site,
  frame: ArenaFrame,
  variant: Variant
) {
  assert(
    isScreenVariant(variant),
    "Trying to resize frame to something that is not a valid screen variant"
  );
  const pinManager = new FramePinManager(site, frame);
  if (pinManager.selectedVariants().includes(variant)) {
    resizeFrameForScreenVariant(site, frame, variant);
  }
}

export const normalDesktopWidth = 1140;

/**
 * This is chosen in 2023. iPhone 13 is 375px. iPhone 11 414px is still more popular, and other popular ones are iPhone
 * 13 Pro Max (390px), but this is still the most common.
 */
export const normalMobileWidth = 375;

/**
 * Returns undefined if the variant is not found in the active screen variant group.
 * Maybe this should not be possible, but for now I'm assuming there might be some situation where that happens.
 */
export function getFrameSizeForTargetScreenVariant(
  site: Site,
  targetVariant: Variant | undefined
): number | undefined {
  const foundRange = getOrderedScreenRanges(site).find(
    (range) => range.variant === targetVariant
  );
  if (!foundRange) {
    console.warn(
      "getFrameSizeForTargetScreenVariant: Target screen variant not found in variant group"
    );
  }
  return foundRange?.bestSize;
}

interface ScreenRange {
  variant: Variant | undefined;
  min: number;
  max: number;
  bestSize: number;
}

export function getOrderedScreenRanges(site: Site): ScreenRange[] {
  // Either we have a bunch of minWidth breakpoints (mobile-first) or a bunch of maxWidth breakpoints (desktop-first).
  // Either way, we can order the breakpoints and define 'ranges' by these breakpoints.
  // Only the 'base' variant would correspond to either smallest range or largest range.

  function parseMq(v: Variant) {
    return parseScreenSpec(
      ensure(v.mediaQuery, "These screen variants should have media queries")
    );
  }

  const unordered = site.activeScreenVariantGroup?.variants ?? [];
  const strategy = getResponsiveStrategy(site);

  if (unordered.length === 0 || strategy === ResponsiveStrategy.unknown) {
    return [
      {
        variant: undefined,
        min: 0,
        max: Infinity,
        bestSize: normalDesktopWidth,
      },
    ];
  }

  const isMobileFirst = strategy === ResponsiveStrategy.mobileFirst;
  function get(v: Variant) {
    return ensure(
      isMobileFirst ? parseMq(v).minWidth : parseMq(v).maxWidth,
      "Screen variant must have expected breakpoint"
    );
  }

  const variants = orderBy(
    unordered,
    [(x) => get(x)],
    [isMobileFirst ? "asc" : "desc"]
  );
  // Here we can always assume there is at least one variant.
  // min-width and max-width are inclusive, so for Desktop-first, if Tablet is max-width 100 and Mobile is max-width 99,
  // then for Tablet we'd want to target 100 and never touch 99, hence the ceil and the +1. Ditto for mobile-first.
  const ranges = isMobileFirst
    ? [
        {
          variant: undefined,
          min: 0,
          max: get(variants[0]) - 1,
          bestSize: Math.min(get(variants[0]) - 1, normalMobileWidth),
        },
        ...pairwise(variants).map(([a, b]) => ({
          variant: a,
          min: get(a) - 1,
          max: get(b),
          bestSize: Math.floor((get(a) - 1 + get(b)) / 2),
        })),
        {
          variant: last(variants),
          min: get(last(variants)),
          max: Infinity,
          bestSize: Math.max(get(last(variants)), normalDesktopWidth),
        },
      ]
    : [
        {
          variant: undefined,
          max: Infinity,
          min: get(variants[0]) + 1,
          bestSize: Math.max(get(variants[0]) + 1, normalDesktopWidth),
        },
        ...pairwise(variants).map(([a, b]) => ({
          variant: a,
          max: get(b) + 1,
          min: get(a),
          bestSize: Math.ceil((get(a) + get(b) + 1) / 2),
        })),
        {
          variant: last(variants),
          max: get(last(variants)),
          min: 0,
          bestSize: Math.min(get(last(variants)), normalMobileWidth),
        },
      ];
  return ranges;
}

function getTwoSidedSpecForScreenVariant(
  site: Site,
  variant: Variant | undefined
) {
  const range = getOrderedScreenRanges(site).find((r) => r.variant === variant);
  return range ? new ScreenSizeSpec(range.min, range.max) : undefined;
}

export function resizeFrameForScreenVariant(
  site: Site,
  frame: ArenaFrame,
  variant: Variant | undefined
) {
  assert(
    variant === undefined || isScreenVariant(variant),
    "Trying to resize frame to something that is not a valid screen variant"
  );
  if (variant === undefined) {
    frame.width =
      getFrameSizeForTargetScreenVariant(site, variant) ?? normalDesktopWidth;
  } else {
    const spec = parseScreenSpec(
      ensure(variant.mediaQuery, "Missing media query from screen variant")
    );

    // We try to make the width fit within this variant's "exclusive" range.
    // For instance, if we satisfy Mobile (and thus Tablet already), but now we target Tablet, then we still want to resize to be wider.
    const nudgedWidth = getClosestSatisfyingWidth(
      frame.width,
      getTwoSidedSpecForScreenVariant(site, variant) ?? spec
    );
    if (nudgedWidth !== frame.width) {
      frame.width =
        getFrameSizeForTargetScreenVariant(site, variant) ??
        getClosestSatisfyingWidth(frame.width, spec);
    }
  }
  ensureActivatedScreenVariantsForFrameByWidth(site, frame);
  syncArenaFrameSize(
    site,
    ensure(
      getArenaContaining(site, frame),
      "Frame does not belong to any arena"
    ),
    frame
  );
}

export const DEFAULT_INITIAL_PAGE_FRAME_SIZE = 800;

export function getFrameHeight(arenaFrame: ArenaFrame) {
  if (isHeightAutoDerived(arenaFrame)) {
    const height =
      arenaFrame._height?.get() ??
      arenaFrame.viewportHeight ??
      DEFAULT_INITIAL_PAGE_FRAME_SIZE;
    if (!arenaFrame._height) {
      // Create the mobx and read from observable so we'll subscribe to updates
      arenaFrame._height = observable.box(height);
      arenaFrame._height.get();
    }
    return height;
  }
  return arenaFrame.height;
}

export function getGridRowLabels(arena: AnyArena | null | undefined): string[] {
  if (isPageArena(arena)) {
    if (arena._focusedFrame) {
      return [];
    }

    return arena.matrix.rows.length === 1
      ? []
      : arena.matrix.rows.map((row) => {
          return getPageArenaRowLabel(arena.component, row);
        });
  }

  if (isComponentArena(arena)) {
    if (arena._focusedFrame) {
      return [];
    }

    return [
      ...arena.matrix.rows.map((row) =>
        getComponentArenaRowLabel(arena.component, row)
      ),
      ...arena.customMatrix.rows.map((_) => COMBINATIONS_CAP),
    ];
  }

  return [];
}

export function hasScreenVariantArenaFrame(frame: ArenaFrame) {
  return frame.targetGlobalVariants.some((v) => isScreenVariant(v));
}
