import {
  getParentOrSlotSelection,
  getTplSlotForParam,
} from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensure, ensureInstance } from "@/wab/shared/common";
import { findVarRefs, isCodeComponent } from "@/wab/shared/core/components";
import { isTagListContainer } from "@/wab/shared/core/rich-text-util";
import { Selectable } from "@/wab/shared/core/selection";
import { SlotSelection, isSlotSelection } from "@/wab/shared/core/slots";
import {
  getComponentIfRoot,
  getParentTplOrSlotSelection,
  hasChildrenSlot,
  hasTextAncestor,
  isAtomicTag,
  isTableNonLeafElement,
  isTableSubElement,
  isTableTopElement,
  isTplComponent,
  isTplImage,
  isTplSlot,
  isTplTag,
  isTplTextBlock,
} from "@/wab/shared/core/tpls";
import { ValNode } from "@/wab/shared/core/val-nodes";
import {
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Type,
  Var,
  isKnownSlotParam,
  isKnownTplSlot,
} from "@/wab/shared/model/classes";
import { nodeConformsToType } from "@/wab/shared/model/model-util";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";

export type CantAddChildMsg =
  | CantAddToTplComponentMsg
  | CantAddToTableNonLeafMsg
  | CantAddToImgMsg
  | CantAddToAtomicMsg
  | CantAddToAttrsChildrenMsg
  | CantAddToTextBlockMsg
  | CantAddLinkedPropsToSlotMsg
  | CantAddToSelfDescendantMsg
  | CantAddCToCodeComponentRootMsg
  | CantAddNonListItemToListMsg
  | CantAddListItemToNonListMsg
  | ViolatesSlotTypeMsg;

export interface CantAddCToCodeComponentRootMsg {
  type: "CantAddToCodeComponentRoot";
  tpl: TplTag;
}

export interface CantAddNonListItemToListMsg {
  type: "CantAddNonListItemToList";
  tpl: TplTag;
}

export interface CantAddListItemToNonListMsg {
  type: "CantAddListItemToNonList";
  tpl: TplNode;
}

export interface CantAddToTplComponentMsg {
  type: "CantAddToTplComponent";
  tpl: TplComponent;
}

export interface CantAddToTableNonLeafMsg {
  type: "CantAddToTableNonLeaf";
  tpl: TplTag;
}

export interface CantAddToImgMsg {
  type: "CantAddToImg";
  tpl: TplTag;
}

export interface CantAddToAtomicMsg {
  type: "CantAddToAtomic";
  tpl: TplTag;
}

export interface CantAddToAttrsChildrenMsg {
  type: "CantAddToAttrsChildren";
  tpl: TplTag;
}

export interface CantAddToTextBlockMsg {
  type: "CantAddToTextBlock";
  tpl: TplTag;
}

export interface CantAddLinkedPropsToSlotMsg {
  type: "CantAddLinkedPropsToSlot";
  slot: TplSlot;
  tpl: TplNode;
  vars: Var[];
}

export interface CantAddToSelfDescendantMsg {
  type: "CantAddToSelfDescendant";
  descendant: TplNode;
  self: TplNode;
}

export interface ViolatesSlotTypeMsg {
  type: "ViolatesSlotType";
  slotType: Type;
}

export function canAddChildrenAndWhy(
  tpl: TplNode | SlotSelection,
  child?: TplNode
): true | CantAddChildMsg {
  if (tpl instanceof SlotSelection) {
    return canAddChildrenToSlotSelectionAndWhy(tpl, child);
  } else if (isTplComponent(tpl)) {
    if (!hasChildrenSlot(tpl)) {
      return { type: "CantAddToTplComponent", tpl };
    }
    const slotParam = ensure(
      tpl.component.params.find((p) => p.variable.name === "children"),
      "Should have children slot"
    );
    if (!isKnownSlotParam(slotParam)) {
      return { type: "CantAddToTplComponent", tpl };
    }
    const slotType = getSlotLikeType(slotParam.tplSlot);
    if (child && !nodeConformsToType(child, slotType)) {
      return { type: "ViolatesSlotType", slotType };
    }
  } else if (isTplTag(tpl)) {
    const component = getComponentIfRoot(tpl);
    if (component && isCodeComponent(component)) {
      return { type: "CantAddToCodeComponentRoot", tpl };
    }
    if (isTableNonLeafElement(tpl)) {
      return { type: "CantAddToTableNonLeaf", tpl };
    }
    if (isTplImage(tpl)) {
      return { type: "CantAddToImg", tpl };
    }
    if (isAtomicTag(tpl.tag)) {
      return { type: "CantAddToAtomic", tpl };
    }
    if (tpl.vsettings.some((vs) => !!vs.attrs.children)) {
      return { type: "CantAddToAttrsChildren", tpl };
    }
    const atomicTextTags = [
      "div",
      "a",
      "code",
      "blockquote",
      "pre",
      "p",
      "label",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
    ];
    if (
      isTplTextBlock(tpl) &&
      (atomicTextTags.includes(tpl.tag) || hasTextAncestor(tpl))
    ) {
      // We don't allow adding children to Text blocks, unless it is a Text block
      // with a special tag (button, section, etc.) and is not in a NodeMarker, in
      // which case, we'll help you transform it into a container when you do
      // add a child.
      return { type: "CantAddToTextBlock", tpl };
    }
  } else if (isTplSlot(tpl) && child) {
    const slotType = getSlotLikeType(tpl);
    if (!nodeConformsToType(child, slotType)) {
      return { type: "ViolatesSlotType", slotType };
    }
  }

  if (
    isTplTag(tpl) &&
    isTagListContainer(tpl.tag) &&
    child &&
    (!isTplTag(child) || child.tag !== "li")
  ) {
    return {
      type: "CantAddNonListItemToList",
      tpl,
    };
  }

  if (
    isTplTag(child) &&
    child.tag === "li" &&
    (!isTplTag(tpl) || !isTagListContainer(tpl.tag))
  ) {
    return {
      type: "CantAddListItemToNonList",
      tpl,
    };
  }

  if (child) {
    const ancestors = $$$(tpl).ancestors().toArrayOfTplNodes();
    const parentSlot = ancestors.find(isTplSlot);
    if (parentSlot) {
      const varRefs = Array.from(findVarRefs(child));
      if (varRefs.length > 0) {
        return {
          type: "CantAddLinkedPropsToSlot",
          slot: parentSlot,
          tpl: child,
          vars: varRefs.map((v) => v.var),
        };
      }
    }

    if (ancestors.includes(child)) {
      return {
        type: "CantAddToSelfDescendant",
        descendant: tpl,
        self: child,
      };
    }
  }

  return true;
}

export function canAddChildrenToSelectableAndWhy(
  obj: Selectable,
  child?: TplNode
) {
  const tplOrSelection = obj instanceof ValNode ? obj.tpl : obj;
  return canAddChildrenAndWhy(tplOrSelection, child);
}

export const canAddChildren = (tpl: TplNode | SlotSelection, child?: TplNode) =>
  canAddChildrenAndWhy(tpl, child) === true;

export function canAddChildrenToSlotSelection(
  ss: SlotSelection,
  child?: TplNode
) {
  return canAddChildrenToSlotSelectionAndWhy(ss, child) === true;
}

/**
 * We are considering that when slot content is forwarded through multiple components, the content is not owned by the
 * the last slot forwarding the content, but by the top most slot that is forwarding the content.
 *
 * Consider the following example:
 *   - ComponentA
 *       - SlotSelection
 *           - TplSlot
 *
 * Since the content of the TplSlot is only occupying the SlotSelection of ComponentA, we consider that the SlotSelection is the owner
 */
function findSlotLikeOwner(slotLike: TplSlot | SlotSelection) {
  if (isKnownTplSlot(slotLike)) {
    const parent = getParentTplOrSlotSelection(slotLike);
    // If the parent of this TplSlot is a slot selection it means that this TplSlot is just forwarding
    // the slot content of it's parent slot selection, so we need to find the owner of the parent slot selection
    if (isSlotSelection(parent)) {
      return findSlotLikeOwner(parent);
    } else {
      // There is a node above the TplSlot that is not a slot selection, so this slotLike is the owner of itself
      return slotLike;
    }
  } else {
    const tpl = slotLike.getTpl();
    // If we are in a slot selection of a code component, we can't go further
    if (isCodeComponent(tpl.component)) {
      return slotLike;
    }

    // We go inside the component to find the slot that owns the content
    const tplSlot = getTplSlotForParam(tpl.component, slotLike.slotParam);
    return findSlotLikeOwner(tplSlot);
  }
}

export function getSlotLikeType(slotLike: TplSlot | SlotSelection) {
  const slotLikeOwner = findSlotLikeOwner(slotLike);

  const component = isKnownTplSlot(slotLikeOwner)
    ? $$$(slotLikeOwner).owningComponent()
    : slotLikeOwner.getTpl().component;
  const param = isKnownTplSlot(slotLikeOwner)
    ? slotLikeOwner.param
    : slotLikeOwner.slotParam;
  return (
    getPlumeEditorPlugin(component)?.getSlotType?.(component, param) ??
    param.type
  );
}

export function canAddChildrenToSlotSelectionAndWhy(
  ss: SlotSelection,
  child?: TplNode
): ViolatesSlotTypeMsg | CantAddToSelfDescendantMsg | true {
  if (child) {
    if ($$$(ss.getTpl()).ancestors().toArrayOfTplNodes().includes(child)) {
      return {
        type: "CantAddToSelfDescendant",
        descendant: ss.getTpl(),
        self: child,
      };
    }
    const slotType = getSlotLikeType(ss);
    if (!nodeConformsToType(child, slotType)) {
      return {
        type: "ViolatesSlotType",
        slotType,
      };
    }
  }
  return true;
}

export const canAddSiblings = (tpl: TplNode, toInsert?: TplNode) =>
  canAddSiblingsAndWhy(tpl, toInsert) === true;

export type CantAddSiblingMsg =
  | CantAddChildMsg
  | CantAddSiblingToRootMsg
  | CantAddSiblingToTableSubMsg
  | CantAddSiblingToSlotSelection
  | CantAddToTextBlockMsg;
export interface CantAddSiblingToRootMsg {
  type: "CantAddSiblingToRoot";
  tpl: TplTag | TplComponent;
}
export interface CantAddSiblingToTableSubMsg {
  type: "CantAddSiblingToTableSub";
  tpl: TplTag | TplComponent;
}
export interface CantAddSiblingToSlotSelection {
  type: "CantAddSiblingToSlotSelection";
  slotSelection: SlotSelection;
}
export function canAddSiblingsAndWhy(
  tpl: TplNode | SlotSelection,
  toInsert?: TplNode | SlotSelection
): true | CantAddSiblingMsg {
  if (tpl instanceof SlotSelection || toInsert instanceof SlotSelection) {
    return {
      type: "CantAddSiblingToSlotSelection",
      slotSelection:
        tpl instanceof SlotSelection
          ? tpl
          : ensureInstance(toInsert, SlotSelection),
    };
  }
  if (!tpl.parent) {
    return { type: "CantAddSiblingToRoot", tpl: tpl as TplTag | TplComponent };
  }
  const parent = ensure(
    getParentOrSlotSelection(tpl),
    "already checked before"
  );
  const canAddToParent = canAddChildrenAndWhy(parent, toInsert);
  if (canAddToParent !== true) {
    return canAddToParent;
  }

  if (isTplTag(tpl) && isTableSubElement(tpl) && !isTableTopElement(tpl)) {
    return { type: "CantAddSiblingToTableSub", tpl };
  }
  if (isTplTextBlock(tpl.parent)) {
    return { type: "CantAddToTextBlock", tpl: tpl.parent };
  }
  return true;
}
