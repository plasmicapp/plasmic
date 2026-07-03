import type { CantInsertTplReason } from "@/wab/client/operations/insert-tpl";
import { joinReactNodes } from "@/wab/commons/components/ReactUtil";
import { TplSlot } from "@/wab/shared/model/classes";
import { typeDisplayName } from "@/wab/shared/model/model-util";
import { CantAddChildMsg, CantAddSiblingMsg } from "@/wab/shared/parenting";
import React from "react";

export interface CantAddToSlotOutOfContext {
  type: "CantAddToSlotOutOfContext";
  tpl: TplSlot;
}

export type ClientCantAddChildMsg = CantAddChildMsg | CantAddToSlotOutOfContext;

export function renderCantAddMsg(
  msg: CantInsertTplReason | ClientCantAddChildMsg | CantAddSiblingMsg,
  opts: { format: "string" }
): string;
export function renderCantAddMsg(
  msg: CantInsertTplReason | ClientCantAddChildMsg | CantAddSiblingMsg,
  opts?: { format?: "string" }
): React.ReactNode;
export function renderCantAddMsg(
  msg: CantInsertTplReason | ClientCantAddChildMsg | CantAddSiblingMsg,
  opts?: { format?: "string" }
) {
  const asString = opts?.format === "string";
  switch (msg.type) {
    case "CantAddToAtomic":
      return asString ? (
        `Cannot add elements to tag ${msg.tpl.tag}`
      ) : (
        <>
          Cannot add elements to tag <code>{msg.tpl.tag}</code>
        </>
      );
    case "CantAddToAttrsChildren":
      return asString ? (
        "Element content already defined by attribute children"
      ) : (
        <>
          Element content already defined by attribute <code>children</code>
        </>
      );
    case "CantAddToImg":
      return `Cannot add elements to images`;
    case "CantAddToTableNonLeaf":
      return `Can only add elements to table cells`;
    case "CantAddToTextBlock":
      return `Cannot add elements to text blocks`;
    case "CantAddToTplComponent":
      return `Cannot add directly to a component instance; add to a component prop instead`;
    case "CantAddToSlotOutOfContext":
      return `Cannot add elements to this slot; turn on "Show default contents" first`;
    case "CantAddLinkedPropsToSlot":
      return asString ? (
        `Cannot add element that references component props (${msg.vars
          .map((v) => v.name)
          .join(", ")}) as default content of a slot.`
      ) : (
        <>
          Cannot add element that references component props (
          {joinReactNodes(
            msg.vars.map((v) => <code>{v.name}</code>),
            ", "
          )}
          ) as default content of a slot.
        </>
      );
    case "CantAddToSelfDescendant":
      return "Cannot add an element to its own children";
    case "CantAddSiblingToRoot":
      return `You cannot add elements next to the root element`;
    case "CantAddSiblingToTableSub":
      return "You cannot add table elements directly";
    case "CantAddSiblingToSlotSelection":
      return "You cannot add to a component instance, only to its slots";
    case "CantAddToCodeComponentRoot":
      return "You cannot add to a code component's root";
    case "ViolatesSlotType":
      return `You can only add ${typeDisplayName(msg.slotType)} to this slot`;
    case "CantAddNonListItemToList":
      return `You cannot add a non-item element to a list.`;
    case "CantAddListItemToNonList":
      return `You cannot add a list item to a non-list container.`;
    case "CantAddNonColumnToColumns":
      return `Columns can only have children elements of type Column.`;
    case "CantAddColumnToNonColumns":
      return `Responsive columns must be kept together.`;
    case "CantAddNonColumnSiblingToColumn":
      return `Column elements can only have siblings of type Column.`;
    case "ComponentCycle":
      return `You cannot insert a component into itself.`;
    case "NestedSlots":
      return `You cannot insert a slot as the default contents of another slot.`;
    default:
      throw new Error(`Unexpected msg type ${(msg as any).type}`);
  }
}
