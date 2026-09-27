import type { CantAddToSlotOutOfContext } from "@/wab/client/messages/parenting-msgs";
import { validateTplRemoval } from "@/wab/client/operations/utils/validate-tpl-removal";
import { canSetDisplayNone } from "@/wab/client/utils/tpl-client-utils";
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
  toVariantKey,
  tryGetBaseVariantSetting,
  tryGetPrivateStyleVariant,
} from "@/wab/shared/Variants";
import { CodeComponentsRegistry } from "@/wab/shared/code-components/code-components";
import { arrayRemove } from "@/wab/shared/collections";
import { redistributeColumnsSizes } from "@/wab/shared/columns-utils";
import { assert, ensure, ensureInstance, maybe } from "@/wab/shared/common";
import {
  attachNewSlotParamsToComponent,
  cloneVariant,
  findVarRefs,
} from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { SlotSelection } from "@/wab/shared/core/slots";
import {
  CONTENT_LAYOUT_WIDTH_OPTIONS,
  WRAP_AS_PARENT_PROPS,
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
  Component,
  Site,
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
  canAddChildren,
  canAddChildrenAndWhy,
  canAddSiblingsAndWhy,
} from "@/wab/shared/parenting";
import {
  TplVisibility,
  clearTplVisibility,
  getTplVisibilityAsDescendant,
  getVariantSettingVisibility,
  setTplVisibility,
} from "@/wab/shared/visibility-utils";
import { merge } from "lodash";
import { Result, err, ok } from "neverthrow";

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
  | { type: "NestedSlots" }
  | { type: "CantWrapWith" }
  | { type: "CantWrapColumn" }
  | { type: "CantReplaceSlot" }
  | { type: "CantReplaceRootInVariant" }
  | { type: "CantReplaceRootWithMany" }
  | { type: "CantRemoveTpl"; message: string };

export type InsertTplResult = Result<void, CantInsertTplReason>;

/** Insertion positions as a sibling or child of the target. */
export type InsertTplLoc = "before" | "after" | "prepend" | "append";

/** Insertion positions for a new tpl, which can also wrap or replace the target. */
export type PasteTplLoc = InsertTplLoc | "wrap" | "replace";

export interface PasteTplCtx extends InsertTplCtx {
  site: Site;
  /** The component that receives the new tpl. */
  component: Component;
  ccRegistry: CodeComponentsRegistry;
}

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
  ctx: InsertTplCtx,
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
  ctx: InsertTplCtx,
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
    "Unexpected undefined value of parent/slotSelection for target",
  );
  return canInsertTplAsChild(newItem, targetParent, ctx);
}

export function canInsertTplAt(
  newItem: TplNode,
  target: TplNode | SlotSelection,
  loc: InsertTplLoc,
  ctx: InsertTplCtx,
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
  ctx: InsertTplCtx,
): InsertTplResult {
  const reason = canInsertTplAsSibling(newNode, targetNode, ctx);
  if (reason !== true) {
    return err(reason);
  }
  const targetParent = ensure(
    getParentOrSlotSelection(targetNode),
    "targetNode should have a targetParent to be used for inserting newNode",
  );
  return insertTplAsChild(
    newNode,
    targetParent,
    ctx,
    loc === "before" ? { beforeNode: targetNode } : { afterNode: targetNode },
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
  opts: InsertTplAsChildOpts = {},
): InsertTplResult {
  opts = merge({ keepFree: true }, opts);
  const reason = canInsertTplAsChild(newNode, newParent, ctx);
  if (reason !== true) {
    return err(reason);
  }
  const existingParent = newNode.parent;
  const isNewNode = !existingParent;
  if (Tpls.isTplTextBlock(newParent)) {
    // Break up text block into a container and text, so we can insert more content
    newParent = ensure(
      convertTextBlockToContainer(newParent, ctx),
      "Unexpected undefined tpl after converting text to container",
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
  return ok(undefined);
}

export function insertTplAt(
  newNode: TplNode,
  target: TplNode,
  loc: InsertTplLoc,
  ctx: InsertTplCtx,
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

export function canInsertTplAsParent(
  newNode: TplNode | SlotSelection,
  target: TplNode | SlotSelection,
): true | CantInsertTplReason {
  // This better be a new node.
  const tpl =
    newNode instanceof SlotSelection
      ? newNode.toTplSlotSelection().tpl
      : newNode;
  if (!tpl) {
    return { type: "CantWrapWith" };
  }
  assert(!tpl.parent, "Unexpected tpl with parent");

  // If we are dealing with a node element being wrapped, then we need to check that the relationship
  // between the parent and the child is still valid after the wrap. So we need to check if the parent
  // of the target can accept the new node as a child.
  if (isKnownTplNode(target)) {
    const parentOrSlotSelection = getParentOrSlotSelection(target);

    // We may be wrapping the root node, in which case the parent won't exist
    if (parentOrSlotSelection) {
      const canAddToParent = canAddChildrenAndWhy(parentOrSlotSelection, tpl);
      if (canAddToParent !== true) {
        return canAddToParent;
      }
    }
  }

  if (isKnownTplNode(target) && Tpls.isTplColumn(target)) {
    return { type: "CantWrapColumn" };
  }

  if (
    !(
      Tpls.isTplTag(newNode) ||
      Tpls.isTplComponent(newNode) ||
      newNode instanceof SlotSelection
    ) ||
    !canAddChildren(newNode)
  ) {
    return { type: "CantWrapWith" };
  }

  return true;
}

/**
 * Inserts the argument `newNode` as a wrapping parent for the argument
 * `child`. The `newNode` will adopt the positioning styles of the `child`,
 * and the `child` will be converted to relatively-positioned within the
 * parent.
 */
export function insertTplAsParent(
  newNode: TplTag | TplComponent | SlotSelection,
  child: TplTag | TplComponent | TplSlot,
  ctx: InsertTplCtx,
): InsertTplResult {
  const reason = canInsertTplAsParent(newNode, child);
  if (reason !== true) {
    return err(reason);
  }

  const tplNewNode =
    newNode instanceof SlotSelection
      ? ensure(
          newNode.toTplSlotSelection().tpl,
          "Unexpected TplSlotSelection without tpl",
        )
      : newNode;

  const vtm = ctx.vtm;

  if (Tpls.isTplTag(tplNewNode) && tplNewNode.type !== "other") {
    tplNewNode.type = "other";
    RSH(vtm.ensureBaseVariantSetting(tplNewNode).rs, tplNewNode).set(
      "display",
      "flex",
    );
  }

  if (Tpls.isComponentRoot(child) && Tpls.isTplVariantable(tplNewNode)) {
    // If the child is a component root, then the newNode will become the
    // new component root.  There are some invariants on what VariantSettings
    // must exist for the root element; we carry that invariant here.
    child.vsettings.forEach((vs) =>
      vtm.ensureVariantSetting(tplNewNode, vs.variants),
    );
  }

  if (Tpls.isTplSlot(child)) {
    $$$(child).wrap(tplNewNode);
    return ok(undefined);
  }

  $$$(child).wrap(newNode);

  if (Tpls.isTplTag(tplNewNode)) {
    // Transfer all the positioning styles from the child to parent
    transferStyleProps(child, tplNewNode, ctx, WRAP_AS_PARENT_PROPS, undefined);
    // By default, the new wrapping parent should be a flex container
    const baseParentExp = RSH(
      vtm.ensureBaseVariantSetting(tplNewNode).rs,
      tplNewNode,
    );
    if (!baseParentExp.has("display")) {
      baseParentExp.set("display", "flex");
    }
    const variantCombos = child.vsettings.map((vs) => vs.variants);
    for (const variantCombo of variantCombos) {
      adoptParentContainerStyleForVariant(
        child,
        tplNewNode,
        variantCombo,
        {
          parentOffset: new Pt(0, 0),
        },
        ctx,
      );
    }
  }
  return ok(undefined);
}

export function canPasteTplAt(
  newItem: TplNode,
  target: TplNode | SlotSelection,
  loc: PasteTplLoc,
  ctx: PasteTplCtx,
): true | CantInsertTplReason {
  switch (loc) {
    case "before":
    case "after":
    case "prepend":
    case "append":
      return canInsertTplAt(newItem, target, loc, ctx);
    case "wrap":
      if (
        !Tpls.isTplTag(newItem) &&
        (!Tpls.isTplComponent(newItem) || !Tpls.hasChildrenSlot(newItem))
      ) {
        return { type: "CantWrapWith" };
      }
      return canInsertTplAsParent(newItem, target);
    case "replace": {
      if (target instanceof SlotSelection) {
        return { type: "CantReplaceSlot" };
      }

      const isNonBaseVariant = !isBaseVariant(ctx.vtm.getCurrentVariantCombo());
      // A non-base replace only takes the hide path when the target is
      // variantable; otherwise it falls through to the destructive path.
      const shouldHideInVariant =
        isNonBaseVariant && Tpls.isTplVariantable(target);

      // The component root is the same node in every variant, so we should
      // not replace it in non-base variant.
      if (target.parent == null && isNonBaseVariant) {
        return { type: "CantReplaceRootInVariant" };
      }

      // Only check TplRef and implicit-state references when target is expected to be removed,
      // because a non-base replace hides the target in the active variant
      // instead of removing it from the tree, so its references can stay valid.
      if (!shouldHideInVariant) {
        const owningComponent = $$$(target).tryGetOwningComponent();
        const removalErr =
          owningComponent &&
          validateTplRemoval([target], owningComponent, ctx.site);
        if (removalErr) {
          return { type: "CantRemoveTpl", message: removalErr.message };
        }
      }
      // Replacing the root: no parent, so no sibling rules to check.
      // Component cycle detection check is already handled in the TplQuery
      // within the replace operation.
      if (target.parent == null) {
        return true;
      }

      return canInsertTplAsSibling(newItem, target, ctx);
    }
  }
}

/**
 * Inserts `newItem`, which the caller has fixed up for the target component,
 * at `loc` relative to `target`. `parentOffset` places an as-child insert in a
 * free container.
 */
export function insertPastedTplAt(
  newItem: TplNode,
  target: TplNode | SlotSelection,
  loc: PasteTplLoc,
  ctx: PasteTplCtx,
  parentOffset?: Pt,
): InsertTplResult {
  const reason = canPasteTplAt(newItem, target, loc, ctx);
  if (reason !== true) {
    return err(reason);
  }

  if (target instanceof SlotSelection) {
    assert(
      loc === "prepend" || loc === "append",
      "Unexpected loc type for inserting at SlotSelection",
    );
    return insertTplAsChild(newItem, target, ctx);
  }

  switch (loc) {
    case "prepend":
    case "append":
      return insertTplAsChild(newItem, target, ctx, {
        parentOffset,
        prepend: loc === "prepend",
      });
    case "before":
    case "after":
      return insertTplAsSibling(newItem, target, loc, ctx);
    case "wrap":
      return insertTplAsParent(
        ensureInstance($$$(newItem).clear().one(), TplTag, TplComponent),
        ensureInstance(target, TplTag, TplComponent, TplSlot),
        ctx,
      );
    case "replace": {
      if (target.parent == null) {
        // Root: no parent to anchor a sibling insert against. replaceWith
        // handles the null-parent branch (and runs checkComponentCycles).
        $$$(target).replaceWith(newItem);
        return ok(undefined);
      }
      // Non-root: delegate to the sibling-insert path so we inherit
      // the full insertAsChild fix-up chain.
      const targetParent = target.parent;
      const result = insertTplAsSibling(newItem, target, "before", ctx);
      if (result.isErr()) {
        return result;
      }

      const currentCombo = ctx.vtm.getCurrentVariantCombo();
      if (Tpls.isTplVariantable(target) && !isBaseVariant(currentCombo)) {
        // variant-scoped replace hides the target in the active combo
        // rather than deleting it from the tree, so base and other
        // variants still see the original element.
        setTplVisibility(
          target,
          currentCombo,
          canSetDisplayNone(ctx.ccRegistry, target)
            ? TplVisibility.DisplayNone
            : TplVisibility.NotRendered,
        );
      } else {
        $$$(target).remove({ deep: true });
        // Column count could change during remove; rebalance the remaining columns.
        if (Tpls.isTplColumns(targetParent)) {
          redistributeColumnsSizes(targetParent, ctx.vtm);
        }
      }
      return ok(undefined);
    }
  }
}

/**
 * Pastes new tpls as siblings: the first at `loc` relative to `target`, and
 * each next one after the previously pasted one. Returns the pasted tpls and
 * why the others could not be pasted.
 */
export function pasteTpls(
  newItems: TplNode[],
  target: TplNode | SlotSelection,
  loc: PasteTplLoc,
  ctx: PasteTplCtx,
  parentOffset?: Pt,
): { pasted: TplNode[]; errors: CantInsertTplReason[] } {
  // Replacing the root with multiple nodes would only replace the first and
  // the rest of the nodes are inserted as siblings, but the root has no siblings.
  if (
    loc === "replace" &&
    newItems.length > 1 &&
    isKnownTplNode(target) &&
    target.parent == null
  ) {
    return { pasted: [], errors: [{ type: "CantReplaceRootWithMany" }] };
  }

  const pasted: TplNode[] = [];
  const errors: CantInsertTplReason[] = [];
  let curTarget = target;
  let curLoc = loc;
  for (const newItem of newItems) {
    if (curLoc === "wrap") {
      // Wrap drops the children, so they must not be fixed up into the component.
      $$$(newItem).clear();
    }
    const reason = canPasteTplAt(newItem, curTarget, curLoc, ctx);
    if (reason !== true) {
      errors.push(reason);
      continue;
    }
    fixupPastedTpl(newItem, ctx);
    const result = insertPastedTplAt(
      newItem,
      curTarget,
      curLoc,
      ctx,
      parentOffset,
    );
    assert(result.isOk(), "Must be able to insert newItem at target");
    pasted.push(newItem);
    curTarget = newItem;
    curLoc = "after";
  }
  return { pasted, errors };
}

function fixupPastedTpl(newItem: TplNode, ctx: PasteTplCtx) {
  const { component, vtm } = ctx;
  const newTplSlots: TplSlot[] = [];

  for (const newNode of Tpls.flattenTpls(newItem)) {
    if (Tpls.isTplSlot(newNode)) {
      newTplSlots.push(newNode);
    }

    if (Tpls.isTplVariantable(newNode)) {
      // Assert that this new node has variant settings that are compatible with the current
      // component's, by checking that its base variant is the same as the current component's.
      // It is the caller's responsibility to make sure this is the case.
      const base = tryGetBaseVariantSetting(newNode);
      assert(
        !!base && base.variants[0] === component.variants[0],
        "New node must target the component's base variant",
      );

      // fix private style variant by cloning.
      const clonedPrivateStyleVariants = new Map<string, Variant>();
      newNode.vsettings.forEach((vs) => {
        const privateSV = tryGetPrivateStyleVariant(vs.variants);
        if (privateSV) {
          const index = vs.variants.indexOf(privateSV);
          assert(
            index !== -1,
            "Unexpected not found privateSV in variant list",
          );
          const privateSVKey = toVariantKey(privateSV);
          // Reuse the cloned version if it already exists.
          const variant = clonedPrivateStyleVariants.get(privateSVKey);
          if (variant) {
            vs.variants[index] = variant;
            return;
          }
          if (privateSV.forTpl !== newNode) {
            const clonedPrivateSV = cloneVariant(privateSV);
            clonedPrivateSV.forTpl = newNode;
            component.variants.push(clonedPrivateSV);
            clonedPrivateStyleVariants.set(privateSVKey, clonedPrivateSV);
            vs.variants[index] = clonedPrivateSV;
          }
        }
      });
    }
  }
  // Remove all VarRefs that do not exist in the current context.
  const componentVars = new Set(component.params.map((p) => p.variable));
  const varRefs = Array.from(findVarRefs(newItem));
  varRefs.forEach((varRef) => {
    if (!componentVars.has(varRef.var)) {
      varRef.remove();
    }
  });

  // If this newItem is being pasted into a non-base context, then set the base variant setting
  // to invisible, just as we do when drawing a new node in a non-base context.
  if (
    Tpls.isTplVariantable(newItem) &&
    !isBaseVariant(vtm.getTargetVariantComboForNode(newItem))
  ) {
    vtm.ensureBaseVariantSetting(newItem).dataCond = codeLit(false);
    vtm.ensureCurrentVariantSetting(newItem, component).dataCond =
      codeLit(true);
  }

  // If we pasted new TplSlots, then we create new corresponding params
  if (newTplSlots.length > 0) {
    attachNewSlotParamsToComponent(ctx.site, component, newTplSlots);
  }
}

function postInsertAsChildUpdates(
  newNode: TplNode,
  newParent: TplNode | SlotSelection,
  isNewNode: boolean,
  ctx: InsertTplCtx,
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
  ctx: InsertTplCtx,
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
  clearProps?: string[],
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
          fromExp.get(prop),
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
  ctx: InsertTplCtx,
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
  ctx: InsertTplCtx,
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
      ctx,
    );
  }
}

function convertToSlotContent(
  child: TplNode,
  ctx: InsertTplCtx,
  variantCombo?: VariantCombo,
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
        RSH(vtm.ensureVariantSetting(child, combo).rs, child),
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
  ctx: InsertTplCtx,
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
    layoutChild,
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
    // List items use normal block flow, even though their display value is
    // classified as a free container. Keep inserted children in that flow.
    (parentContainerType === ContainerLayoutType.free &&
      effectiveParentExp.get("display") !== "list-item") ||
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
  parentOffset?: Pt | "current",
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
  ctx: InsertTplCtx,
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
  ctx: InsertTplCtx,
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
  ctx: InsertTplCtx,
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
  inferFlexStyleFromChild = false,
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
    true,
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
          "Should check if privateStyleVariantsMap contains variant",
        );
      }
      if (isPrivateStyleVariant(v) && owningComponent) {
        const newVariant = ctx.tplMgr.createPrivateStyleVariant(
          owningComponent,
          textChildNode,
          maybe(v.selectors, (s) => [...s]),
        );
        privateStyleVariantsMap.set(v, newVariant);
        return newVariant;
      }
      return v;
    });
    const childVs = vtm.ensureVariantSetting(
      textChildNode,
      variantCombo,
      vtm.getOwningComponentForNewNode(),
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
    ctx,
  );
  return container;
}
