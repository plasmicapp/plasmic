import type { CantAddToSlotOutOfContext } from "@/wab/client/messages/parenting-msgs";
import { RSH, hasTypography } from "@/wab/shared/RuleSetHelpers";
import {
  getAncestorTplSlot,
  getParentOrSlotSelection,
} from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import {
  VariantCombo,
  isBaseVariant,
  isPrivateStyleVariant,
} from "@/wab/shared/Variants";
import { arrayRemove } from "@/wab/shared/collections";
import { redistributeColumnsSizes } from "@/wab/shared/columns-utils";
import { ensure, maybe } from "@/wab/shared/common";
import { SlotSelection } from "@/wab/shared/core/slots";
import {
  CONTENT_LAYOUT_WIDTH_OPTIONS,
  contentLayoutChildProps,
  flexChildProps,
  getAllDefinedStyles,
  gridChildProps,
  ignoredConvertablePlainTextProps,
  typographyCssProps,
} from "@/wab/shared/core/style-props";
import * as Tpls from "@/wab/shared/core/tpls";
import { asTpl } from "@/wab/shared/core/vals";
import { Pt } from "@/wab/shared/geom";
import {
  ContainerLayoutType,
  PositionLayoutType,
  convertToSlotContent as convertExpToSlotContent,
  convertSelfContainerType,
  convertToAbsolutePosition,
  convertToRelativePosition,
  getRshContainerType,
  getRshPositionType,
} from "@/wab/shared/layoututils";
import {
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Variant,
  isKnownTplNode,
} from "@/wab/shared/model/classes";
import {
  CantAddChildMsg,
  CantAddSiblingMsg,
  canAddChildrenAndWhy,
  canAddSiblingsAndWhy,
} from "@/wab/shared/parenting";
import {
  TplVisibility,
  clearTplVisibility,
  getTplVisibilityAsDescendant,
  getVariantSettingVisibility,
} from "@/wab/shared/visibility-utils";
import { merge } from "lodash";

/**
 * Context for the pure tpl-insertion operation.
 *
 * Carries the TplMgrs and ViewCtx dependent functions
 * Callers operating without a ViewCtx (copilot tools, unit tests) omit
 * the optional functions.
 */
export interface InsertTplCtx {
  vtm: VariantTplMgr;
  tplMgr: TplMgr;
  /**
   * Reads the rendered offset of a tpl on the canvas. Only consulted when an
   * element's position type changes (to free/fixed/sticky) so it can keep its
   * current visual position. When omitted, offsets fall back to origin / unchanged.
   */
  getDomOffset?: (tpl: TplNode) => Pt | undefined;
  /**
   * UI gate for inserting into a TplSlot's default contents. ViewOps passes
   * the "Show default slot contents" toggle state for the currently edited
   * component; callers without ViewCtx such as tools can omit it.
   */
  canEditSlotDefaultContents?: (slot: TplSlot) => boolean;
}

export type CantInsertTplReason =
  | CantAddChildMsg
  | CantAddSiblingMsg
  | CantAddToSlotOutOfContext
  | { type: "CantAddNonColumnToColumns" }
  | { type: "CantAddColumnToNonColumns" }
  | { type: "CantAddNonColumnSiblingToColumn" }
  | { type: "ComponentCycle" }
  | { type: "NestedSlots" };

export type InsertTplResult =
  | { result: "success" }
  | { result: "error"; reason: CantInsertTplReason };

/** Insertion positions supported by the pure operation (wrap/replace are
 * ViewOps compositions on top of these). */
export type InsertTplLoc = "before" | "after" | "prepend" | "append";

export interface InsertTplAsChildOpts {
  parentOffset?: Pt;
  forceFree?: boolean;
  keepFree?: boolean;
  prepend?: boolean;
  beforeNode?: TplNode;
  afterNode?: TplNode;
}

export function canInsertTplAsChild(
  newItem: TplNode,
  targetTplOrSlotSelection: TplNode | SlotSelection,
  ctx: InsertTplCtx
): true | CantInsertTplReason {
  const canAdd = canAddChildrenAndWhy(targetTplOrSlotSelection, newItem);
  if (canAdd !== true) {
    return canAdd;
  }

  if (
    isKnownTplNode(targetTplOrSlotSelection) &&
    Tpls.isTplColumns(targetTplOrSlotSelection) &&
    !Tpls.isTplColumn(newItem)
  ) {
    return { type: "CantAddNonColumnToColumns" };
  }

  if (
    !(
      isKnownTplNode(targetTplOrSlotSelection) &&
      Tpls.isTplColumns(targetTplOrSlotSelection)
    ) &&
    Tpls.isTplColumn(newItem)
  ) {
    return { type: "CantAddColumnToNonColumns" };
  }

  if (
    Tpls.isTplSlot(targetTplOrSlotSelection) &&
    !(ctx.canEditSlotDefaultContents?.(targetTplOrSlotSelection) ?? true)
  ) {
    return {
      type: "CantAddToSlotOutOfContext",
      tpl: targetTplOrSlotSelection,
    };
  }
  const destOwner = Tpls.getTplOwnerComponent(asTpl(targetTplOrSlotSelection));
  const hasComponentCycle = Tpls.detectComponentCycle(destOwner, [newItem]);
  if (hasComponentCycle) {
    return { type: "ComponentCycle" };
  }

  if (
    Tpls.ancestorsUp(asTpl(targetTplOrSlotSelection)).some(Tpls.isTplSlot) &&
    Tpls.flattenTpls(newItem).some(Tpls.isTplSlot)
  ) {
    return { type: "NestedSlots" };
  }

  return true;
}

export function canInsertTplAsSibling(
  newItem: TplNode,
  target: TplNode | SlotSelection,
  ctx: InsertTplCtx
): true | CantInsertTplReason {
  const canAdd = canAddSiblingsAndWhy(target, newItem);
  if (canAdd !== true) {
    return canAdd;
  }

  // Column can only be sibling of another column
  if (
    !(isKnownTplNode(target) && Tpls.isTplColumn(target)) &&
    Tpls.isTplColumn(newItem)
  ) {
    return { type: "CantAddColumnToNonColumns" };
  }
  if (
    isKnownTplNode(target) &&
    Tpls.isTplColumn(target) &&
    !Tpls.isTplColumn(newItem)
  ) {
    return { type: "CantAddNonColumnSiblingToColumn" };
  }

  if (target instanceof SlotSelection) {
    return { type: "CantAddSiblingToSlotSelection", slotSelection: target };
  }

  const targetParent = ensure(
    getParentOrSlotSelection(target),
    "Unexpected undefined value of parent/slotSelection for target"
  );
  return canInsertTplAsChild(newItem, targetParent, ctx);
}

export function canInsertTplAt(
  newItem: TplNode,
  target: TplNode,
  loc: InsertTplLoc,
  ctx: InsertTplCtx
): true | CantInsertTplReason {
  return loc === "before" || loc === "after"
    ? canInsertTplAsSibling(newItem, target, ctx)
    : canInsertTplAsChild(newItem, target, ctx);
}

/**
 * Inserts the argument `newNode` as a sibling to `targetNode`, before or
 * after it. This will also adopt the parent container's container type for the
 * newNode (so if parent is free, child becomes free; if parent is flex, child
 * becomes relative, etc.)
 */
export function insertTplAsSibling(
  newNode: TplNode,
  targetNode: TplNode,
  loc: "before" | "after",
  ctx: InsertTplCtx
): InsertTplResult {
  const reason = canInsertTplAsSibling(newNode, targetNode, ctx);
  if (reason !== true) {
    return { result: "error", reason };
  }
  const targetParent = ensure(
    getParentOrSlotSelection(targetNode),
    "targetNode should have a targetParent to be used for inserting newNode"
  );
  return insertTplAsChild(
    newNode,
    targetParent,
    ctx,
    loc === "before" ? { beforeNode: targetNode } : { afterNode: targetNode }
  );
}

/**
 * Inserts the argument `newNode` as a child of `newParent` (last child by
 * default). This will also adopt the parent container's container type for the
 * `newNode` (so if parent is free, child becomes free; if parent is flex,
 * child becomes relative, etc.)
 * @param opts.parentOffset if parent is free, or if opts.forceFree is true,
 *   then the `newNode` will be absolutely positioned. `parentOffset` specifies
 *   where in the new parent container this node should be.
 * @param opts.forceFree if parent is not free, usually the child will be
 *   relatively-positioned. You can force the child to still be free by
 *   passing true for forceFree.
 * @param opts.keepFree if argument `newNode` has position free, keep it, else
 *   use `newParent` container position to calculate the new child position.
 *   Defaults to true.
 */
export function insertTplAsChild(
  newNode: TplNode,
  newParent: TplNode | SlotSelection,
  ctx: InsertTplCtx,
  opts: InsertTplAsChildOpts = {}
): InsertTplResult {
  opts = merge({ keepFree: true }, opts);
  const reason = canInsertTplAsChild(newNode, newParent, ctx);
  if (reason !== true) {
    return { result: "error", reason };
  }
  const existingParent = newNode.parent;
  const isNewNode = !existingParent;
  if (Tpls.isTplTextBlock(newParent)) {
    // Break up text block into a container and text, so we can insert more content
    newParent = ensure(
      convertTextBlockToContainer(newParent, ctx),
      "Unexpected undefined tpl after converting text to container"
    );
  }
  if (
    Tpls.isTplSlot(newParent) &&
    Tpls.isTplTextBlock(newNode, "div") &&
    newParent.defaultContents.length === 0 &&
    Tpls.hasOnlyStyles(newNode, typographyCssProps, {
      excludeProps: ignoredConvertablePlainTextProps,
    })
  ) {
    // When adding a text block into a TplSlot, we're going to forcibly adopt
    // its styles for the TplSlot
    copyMixins(newNode, newParent, ctx);
    transferStyleProps(newNode, newParent, ctx, typographyCssProps);
    clearAllStyles(newNode);
  }

  adoptLayoutParentContainerStyle(newNode, newParent, opts, ctx);
  if (
    isKnownTplNode(newParent) &&
    (Tpls.isTplSlot(newParent) || getAncestorTplSlot(newParent, true))
  ) {
    // If newNode is going to become defaultContent of something, then only keep
    // its base variant setting
    ctx.vtm.ensureSlotDefaultContentSetting(newNode);
  }
  if (opts.beforeNode) {
    $$$(opts.beforeNode).before(newNode);
  } else if (opts.afterNode) {
    $$$(opts.afterNode).after(newNode);
  } else if (newParent !== existingParent) {
    if (opts.prepend) {
      $$$(newParent).prepend(newNode);
    } else {
      $$$(newParent).append(newNode);
    }
  }

  postInsertAsChildUpdates(newNode, newParent, isNewNode, ctx);
  return { result: "success" };
}

export function insertTplAt(
  newNode: TplNode,
  target: TplNode,
  loc: InsertTplLoc,
  ctx: InsertTplCtx
): InsertTplResult {
  switch (loc) {
    case "before":
    case "after":
      return insertTplAsSibling(newNode, target, loc, ctx);
    case "prepend":
      return insertTplAsChild(newNode, target, ctx, { prepend: true });
    case "append":
      return insertTplAsChild(newNode, target, ctx);
  }
}

function postInsertAsChildUpdates(
  newNode: TplNode,
  newParent: TplNode | SlotSelection,
  isNewNode: boolean,
  ctx: InsertTplCtx
) {
  if (
    isKnownTplNode(newParent) &&
    Tpls.isTplColumns(newParent) &&
    Tpls.isTplColumn(newNode)
  ) {
    redistributeColumnsSizes(newParent, ctx.vtm);
    // We clear the tpl column visibility when it's added,
    // so that we don't have empty spaces by default when the
    // user is recording a variant and adding new column.
    const baseVs = ctx.vtm.ensureBaseVariantSetting(newNode);
    clearTplVisibility(newNode, baseVs.variants);
  }

  if (isNewNode && Tpls.isTplVariantable(newNode)) {
    fixupNewlyInsertedNode(newNode, ctx);
  }
}

function fixupNewlyInsertedNode(newNode: TplNode, ctx: InsertTplCtx) {
  const vtm = ctx.vtm;
  const curCombo = vtm.getTargetVariantComboForNode(newNode, {
    forVisibility: true,
  });
  if (!isBaseVariant(curCombo)) {
    // If this is a new node for a non-base variant, then we may have set its
    // visibility to not visible in the base variant, so that it is only visible
    // in this current combo.  But that is redundant if it is being added to a subtree
    // that is already invisible in the base variant, so we clear the visibility setting
    // from both its base and cur variants if some ancestor node is already invisible
    // in the base variant.
    const baseVs = vtm.ensureBaseVariantSetting(newNode);
    if (
      getVariantSettingVisibility(baseVs) !== TplVisibility.Visible &&
      getTplVisibilityAsDescendant(newNode, baseVs.variants, false) !==
        TplVisibility.Visible
    ) {
      clearTplVisibility(newNode, curCombo);
      clearTplVisibility(newNode, baseVs.variants);
    }
  }
}

export function copyMixins(
  fromNode: TplNode,
  toNode: TplNode,
  ctx: InsertTplCtx
) {
  const vtm = ctx.vtm;
  for (const fromVs of fromNode.vsettings) {
    if (fromVs.variants.some((v) => isPrivateStyleVariant(v))) {
      // Only transfer non-private variants
      continue;
    }
    vtm.ensureVariantSetting(toNode, fromVs.variants).rs.mixins =
      fromVs.rs.mixins.slice(0);
  }
}

export function transferStyleProps(
  fromNode: TplNode,
  toNode: TplNode,
  ctx: InsertTplCtx,
  props?: string[],
  clearProps?: string[]
) {
  const vtm = ctx.vtm;
  for (const fromVs of fromNode.vsettings) {
    // Only transfer non-private variants
    if (fromVs.variants.some((v) => isPrivateStyleVariant(v))) {
      continue;
    }
    const fromExp = RSH(fromVs.rs, fromNode);
    for (const prop of props || getAllDefinedStyles(fromVs.rs)) {
      if (fromExp.has(prop)) {
        RSH(vtm.ensureVariantSetting(toNode, fromVs.variants).rs, toNode).set(
          prop,
          fromExp.get(prop)
        );
        if (!clearProps || clearProps.includes(prop)) {
          fromExp.clear(prop);
        }
      }
    }
  }
}

export function clearAllStyles(tpl: TplNode) {
  tpl.vsettings.forEach((vs) => {
    vs.rs.values = {};
    vs.rs.mixins = [];
    vs.rs.animations = null;
  });
}

function adoptLayoutParentContainerStyle(
  child: TplNode,
  parent: TplNode | SlotSelection,
  opts: { parentOffset?: Pt; forceFree?: boolean; keepFree?: boolean },
  ctx: InsertTplCtx
) {
  const layoutParent = $$$(parent)
    .layoutParent({ includeSelf: true })
    .maybeOne();
  const curLayoutParent = $$$(child)
    .layoutParent({ includeSelf: false })
    .maybeOne();

  if (layoutParent === curLayoutParent) {
    // If the layout parent hasn't changed, then we will preserve existing styles
    // instead of resetting them
    return;
  }

  const layoutChildren = $$$(child).layoutContent().toArray();
  if (Tpls.isTplTag(layoutParent)) {
    for (const layoutChild of layoutChildren) {
      if (Tpls.isTplVariantable(layoutChild)) {
        adoptParentContainerStyle(layoutChild, layoutParent, opts, ctx);
      }
    }
  } else if (layoutParent instanceof SlotSelection) {
    for (const layoutChild of layoutChildren) {
      if (Tpls.isTplVariantable(layoutChild)) {
        convertToSlotContent(layoutChild, ctx);
      }
    }
  }
}

/**
 * Adopts the parent's container style across all variants where the parent's
 * container style is specified.
 */
export function adoptParentContainerStyle(
  layoutChild: TplNode,
  layoutParent: TplTag,
  opts: { parentOffset?: Pt; forceFree?: boolean; keepFree?: boolean },
  ctx: InsertTplCtx
) {
  if (!Tpls.isTplTagOrComponent(layoutChild)) {
    return;
  }

  const vtm = ctx.vtm;

  vtm.ensureBaseVariantSetting(layoutChild);
  vtm.ensureCurrentVariantSetting(layoutChild);

  // If we are re-parenting, then we must fix up and adapt to the new parent
  // for all variants.  Else if we are in the same parent, then we are only
  // moving absolute position or the relative ordering of the child, so we
  // should only target the current variant.
  const curLayoutParent = $$$(layoutChild).layoutParent().maybeOneTpl();
  const variantCombos =
    curLayoutParent === layoutParent
      ? [vtm.getTargetVariantComboForNode(layoutChild)]
      : layoutChild.vsettings.map((vs) => vs.variants);

  // We loop through and adopt parent style for all relavant variants
  for (const variantCombo of variantCombos) {
    adoptParentContainerStyleForVariant(
      layoutChild,
      layoutParent,
      variantCombo,
      opts,
      ctx
    );
  }
}

function convertToSlotContent(
  child: TplNode,
  ctx: InsertTplCtx,
  variantCombo?: VariantCombo
) {
  const vtm = ctx.vtm;
  const combos = variantCombo
    ? [variantCombo]
    : child.vsettings.map((vs) => vs.variants);

  for (const combo of combos) {
    // If adding to a slot, then slot children is always relatively positioned
    const effectiveExp = vtm.effectiveVariantSetting(child, combo).rsh();
    if (
      getRshPositionType(effectiveExp) !== PositionLayoutType.auto ||
      ["left", "top", "bottom", "right"].some((prop) => effectiveExp.has(prop))
    ) {
      convertExpToSlotContent(
        effectiveExp,
        RSH(vtm.ensureVariantSetting(child, combo).rs, child)
      );
    }
  }
}

/**
 * Adopts the parent's container style for a specific variant
 */
export function adoptParentContainerStyleForVariant(
  layoutChild: TplNode,
  layoutParent: TplTag,
  variantCombo: VariantCombo,
  opts: { parentOffset?: Pt; forceFree?: boolean; keepFree?: boolean },
  ctx: InsertTplCtx
) {
  if (!Tpls.isTplTagOrComponent(layoutChild)) {
    return;
  }
  const vtm = ctx.vtm;
  const effectiveParentExp = vtm
    .effectiveVariantSetting(layoutParent, variantCombo)
    .rsh();
  const parentContainerType = getRshContainerType(effectiveParentExp);
  const effectiveChildExp = vtm
    .effectiveVariantSetting(layoutChild, variantCombo)
    .rsh();
  const childPositionType = getRshPositionType(effectiveChildExp);

  // Clear irrelevant styles that may have come from
  // being a child of a different layout
  const exp = RSH(
    vtm.ensureVariantSetting(layoutChild, variantCombo).rs,
    layoutChild
  );
  if (parentContainerType !== ContainerLayoutType.contentLayout) {
    exp.clearAll(contentLayoutChildProps);
    const width = exp.getRaw("width");
    if (width && CONTENT_LAYOUT_WIDTH_OPTIONS.includes(width)) {
      exp.set("width", "stretch");
    }
  }
  if (parentContainerType !== ContainerLayoutType.grid) {
    exp.clearAll(gridChildProps);
  }
  if (!parentContainerType.includes("flex")) {
    exp.clearAll(flexChildProps);
  }

  // Fixed elements aren't affected by their parent style changes
  if (childPositionType === PositionLayoutType.fixed) {
    return;
  }

  // as sticky works with both layout types, we just adopt it
  // recalculating the offset
  if (childPositionType === PositionLayoutType.sticky) {
    adoptStickyPositionType(layoutChild, variantCombo, ctx);
    return;
  }

  const newChildPosType =
    opts.forceFree ||
    parentContainerType === ContainerLayoutType.free ||
    (opts.keepFree && childPositionType === PositionLayoutType.free)
      ? "free"
      : "auto";
  if (newChildPosType === "free") {
    let offset: Pt | "current" | undefined = opts.parentOffset;
    if (!offset) {
      if (layoutChild.parent === layoutParent) {
        // If this is the same parent, then by default when going to freely-positioned,
        // we use the current offset of the DOM
        offset = "current";
      } else {
        // Else if we are re-parenting, and there's no offset specified, then the best
        // we can do is at the origin!
        offset = new Pt(0, 0);
      }
    }
    adoptFreePositionType(layoutChild, variantCombo, ctx, offset);
  } else {
    adoptRelativePositionType(layoutChild, variantCombo, ctx);
  }
}

/**
 * Adopts the "free" position type for the argument `node` for the argument
 * `variant`.
 *
 * @param parentOffset If specified, then it is used as the left/top position
 *   for the `node`.  If you specify "current" as parentOffset, then the current
 * DOM offset will be used.  Note that this is a little weird, as the current
 *   DOM offset may not actually reflect the argument `variant` you're using!
 *    If not specified, then top/left are left unchanged.
 *
 * If we are converting from fixed position, then we are going to ignore
 * offsets since it can represent a position outside of the parent, considering
 * it can lead to bugs.
 *
 * If we are converting from relative position, then the width/height of
 * current relatively-positioned DOM node will be explicitly set as the
 *   width/height.
 */
export function adoptFreePositionType(
  node: TplTag | TplComponent,
  variants: Variant[],
  ctx: InsertTplCtx,
  parentOffset?: Pt | "current"
) {
  const vtm = ctx.vtm;
  const effectiveExp = vtm.effectiveVariantSetting(node, variants).rsh();
  const curPosType = getRshPositionType(effectiveExp);

  // We want to avoid creating a new VariantSetting if the effective VS is already
  // correct
  const mkExp = () => RSH(vtm.ensureVariantSetting(node, variants).rs, node);

  if (curPosType !== PositionLayoutType.free) {
    const exp = mkExp();
    convertToAbsolutePosition(exp);
    if (!parentOffset) {
      parentOffset = ctx.getDomOffset?.(node);
    }
  }

  let offset: { x: number; y: number } | undefined;

  // Ignore offset if it's coming from a fixed element
  if (curPosType === PositionLayoutType.fixed) {
    offset = { x: 0, y: 0 };
  } else {
    if (parentOffset === "current") {
      offset = ctx.getDomOffset?.(node);
    } else {
      offset = parentOffset;
    }
  }

  if (
    offset &&
    (effectiveExp.get("left") !== `${offset.x}px` ||
      effectiveExp.get("top") !== `${offset.y}px`)
  ) {
    const exp = mkExp();
    exp.set("left", `${offset.x}px`);
    exp.set("top", `${offset.y}px`);
    exp.clear("right");
    exp.clear("bottom");
  }
}

/**
 * Adopts "auto" / relative position type for the argument `node` for the
 * argument `variant`.
 */
export function adoptRelativePositionType(
  node: TplTag | TplComponent,
  variantCombo: VariantCombo,
  ctx: InsertTplCtx
) {
  const vtm = ctx.vtm;
  const effectiveExp = vtm.effectiveVariantSetting(node, variantCombo).rsh();
  const curPosType = getRshPositionType(effectiveExp);
  if (
    curPosType !== PositionLayoutType.auto ||
    ["left", "top", "right", "bottom"].some((prop) => effectiveExp.has(prop))
  ) {
    const exp = RSH(vtm.ensureVariantSetting(node, variantCombo).rs, node);
    convertToRelativePosition(effectiveExp, exp);
  }
}

/**
 * Adopts fixed position type for the argument `node`.
 *
 * Used the element offset to position the element properly.
 */
export function adoptFixedPositionType(
  node: TplTag | TplComponent,
  variantCombo: VariantCombo,
  ctx: InsertTplCtx
) {
  const vtm = ctx.vtm;
  const effectiveExp = vtm.effectiveVariantSetting(node, variantCombo).rsh();
  const curPosType = getRshPositionType(effectiveExp);

  if (curPosType !== PositionLayoutType.fixed) {
    const exp = RSH(vtm.ensureVariantSetting(node, variantCombo).rs, node);

    const offset = ctx.getDomOffset?.(node) || { x: 0, y: 0 };
    exp.set("left", `${offset.x}px`);
    exp.set("top", `${offset.y}px`);
    exp.clear("right");
    exp.clear("bottom");

    if (!effectiveExp.has("z-index")) {
      exp.set("z-index", "1");
    }

    exp.set("position", "fixed");
  }
}

/**
 * Adopts sticky position type for the argument `node`.
 */
export function adoptStickyPositionType(
  node: TplTag | TplComponent,
  variantCombo: VariantCombo,
  ctx: InsertTplCtx
) {
  const vtm = ctx.vtm;
  const effectiveExp = vtm.effectiveVariantSetting(node, variantCombo).rsh();
  const curPosType = getRshPositionType(effectiveExp);

  if (curPosType !== PositionLayoutType.sticky) {
    const exp = RSH(vtm.ensureVariantSetting(node, variantCombo).rs, node);

    let offset: { x: number; y: number } | undefined;
    if (
      curPosType === PositionLayoutType.fixed ||
      curPosType === PositionLayoutType.auto
    ) {
      offset = { x: 0, y: 0 };
    } else {
      offset = ctx.getDomOffset?.(node) || { x: 0, y: 0 };
    }

    exp.set("left", `${offset.x}px`);
    exp.set("top", `${offset.y}px`);
    exp.clear("right");
    exp.clear("bottom");

    if (!effectiveExp.has("z-index")) {
      exp.set("z-index", "1");
    }

    exp.set("position", "sticky");
  }
}

/**
 * Converts a text block into a container: the text (and its typography
 * styling) moves into a new nested text child, and the original element
 * becomes a plain container ready to accept more children.
 *
 * Returns undefined (without mutating) when the text block is inside a rich
 * text block, which is not supported.
 */
export function convertTextBlockToContainer(
  tpl: Tpls.TplTextTag,
  ctx: InsertTplCtx,
  inferFlexStyleFromChild = false
): TplTag | undefined {
  if (Tpls.hasTextAncestor(tpl)) {
    return undefined;
  }
  const container = tpl as TplTag;
  container.type = "other";
  const vtm = ctx.vtm;
  const textChildNode = vtm.mkTplTagX(
    "div",
    { type: Tpls.TplTagType.Text },
    undefined,
    true
  );
  textChildNode.children = container.children;
  container.children = [];
  Tpls.fixParentPointers(textChildNode);
  const owningComponent = $$$(container).tryGetOwningComponent();
  const privateStyleVariantsMap = new Map<Variant, Variant>();
  for (const vs of container.vsettings) {
    const variantCombo = vs.variants.map((v) => {
      if (privateStyleVariantsMap.has(v)) {
        return ensure(
          privateStyleVariantsMap.get(v),
          "Should check if privateStyleVariantsMap contains variant"
        );
      }
      if (isPrivateStyleVariant(v) && owningComponent) {
        const newVariant = ctx.tplMgr.createPrivateStyleVariant(
          owningComponent,
          textChildNode,
          maybe(v.selectors, (s) => [...s])
        );
        privateStyleVariantsMap.set(v, newVariant);
        return newVariant;
      }
      return v;
    });
    const childVs = vtm.ensureVariantSetting(
      textChildNode,
      variantCombo,
      vtm.getOwningComponentForNewNode()
    );
    // Move the text and typography styling from parent to child vs
    childVs.text = vs.text;
    vs.text = undefined;

    const parentExpr = RSH(vs.rs, container);
    const childExpr = RSH(childVs.rs, container);

    if (inferFlexStyleFromChild) {
      // `button` without text-align is assumed to have `text-align:
      // center` from default user agent styles.
      if (parentExpr.has("text-align") || container.tag === "button") {
        const align = parentExpr.get("text-align") || "center";
        if (align === "center") {
          parentExpr.set("justify-content", "center");
        } else if (align === "right") {
          parentExpr.set("justify-content", "flex-end");
        }
      }
    }

    for (const prop of typographyCssProps) {
      if (parentExpr.has(prop)) {
        const val = parentExpr.getRaw(prop);
        if (val) {
          childExpr.set(prop, val);
        }
        parentExpr.clear(prop);
      } else if (container.tag === "button") {
        childExpr.set("text-align", "center");
      }
    }

    for (const mixin of vs.rs.mixins) {
      if (hasTypography(RSH(mixin.rs, container))) {
        childVs.rs.mixins.push(mixin);
        arrayRemove(vs.rs.mixins, mixin);
      }
    }
  }

  // On the base variant, set the default container type.
  const baseVs = vtm.ensureBaseVariantSetting(container);
  const parent = container.parent;
  // Effective container type of the parent under the current variant combo
  // (what getContainerType(parent, viewCtx) resolves to in the Studio).
  const parentType =
    parent && Tpls.isTplTagOrComponent(parent)
      ? getRshContainerType(vtm.effectiveVariantSetting(parent).rsh())
      : undefined;
  if (parentType && parentType !== "free" && !inferFlexStyleFromChild) {
    convertSelfContainerType(RSH(baseVs.rs, container), parentType);
  } else {
    convertSelfContainerType(RSH(baseVs.rs, container), "flex-row");
  }
  $$$(container).append(textChildNode);
  adoptParentContainerStyleForVariant(
    textChildNode,
    container,
    baseVs.variants,
    {},
    ctx
  );
  return container;
}
