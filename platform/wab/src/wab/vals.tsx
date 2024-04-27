import { isKnownRenderExpr, isKnownTplNode, TplNode } from "@/wab/classes";
import { switchType, unreachable } from "@/wab/common";
import { Selectable } from "@/wab/selection";
import {
  isPlaceholderValue,
  UNINITIALIZED_BOOLEAN,
  UNINITIALIZED_NUMBER,
  UNINITIALIZED_OBJECT,
  UNINITIALIZED_STRING,
} from "@/wab/shared/core/model-util";
import { SlotSelection } from "@/wab/slots";
import { capitalizeFirst } from "@/wab/strs";
import { ValNode } from "@/wab/val-nodes";
import L from "lodash";
import * as US from "underscore.string";

export const summarizeVal = function (val: any) {
  if (val == null) {
    return "Nothing";
  } else if (L.isString(val)) {
    return US.quote(val);
  } else if (L.isNumber(val) || L.isDate(val) || L.isBoolean(val)) {
    return `${val}`;
  } else if (
    isKnownRenderExpr(val) ||
    isKnownTplNode(val) ||
    (Array.isArray(val) && val.length > 0 && isKnownTplNode(val[0]))
  ) {
    return "Renderable";
  } else if (Array.isArray(val)) {
    // Don't say "List of 1 items" - it's confusing yet super common because queries often must return lists yet are meant to only fetch one item.
    return val.length === 0 ? "Empty list" : `${val.length} items`;
  } else if (val instanceof Error) {
    return `ERROR: ${val}`;
  } else if (L.isObject(val)) {
    // TODO make DB objects tagged with their type
    return `${val["__tableName"] || capitalizeFirst(val.constructor.name)}`;
  } else if (isPlaceholderValue(val)) {
    if (val === UNINITIALIZED_STRING) {
      return `Some string`;
    } else if (val === UNINITIALIZED_NUMBER) {
      return `Some number`;
    } else if (val === UNINITIALIZED_BOOLEAN) {
      return `Some boolean`;
    } else if (val === UNINITIALIZED_OBJECT) {
      return `Some object`;
    } else {
      unreachable(val);
    }
  } else {
    throw new Error(`Unknown value of type ${val.constructor.name}`);
  }
};
export type FocusObj = SlotSelection | ValNode;

export function asVal(x: Selectable): ValNode | undefined {
  return x instanceof ValNode ? x : x.val;
}

export function tplFromSelectable(s: Selectable): TplNode {
  return switchType(s)
    .when(ValNode, (x) => x.tpl)
    .when(SlotSelection, (x) => x.getTpl())
    .result();
}

export function asTpl(v: Selectable | TplNode): TplNode {
  return switchType(v)
    .when(TplNode, (x) => x)
    .when([SlotSelection, ValNode], (x) => tplFromSelectable(x))
    .result();
}

export function isValSelectable(x: Selectable) {
  return x instanceof ValNode || !!x.val;
}

export function asTplOrSlotSelection(
  v: Selectable | TplNode
): TplNode | SlotSelection {
  return switchType(v)
    .when(TplNode, (x) => x)
    .when(ValNode, (x) => x.tpl)
    .when(SlotSelection, (x) => x.toTplSlotSelection())
    .result();
}

export function equivTplOrSlotSelection(
  x: TplNode | SlotSelection,
  y: TplNode | SlotSelection
): boolean {
  return x instanceof SlotSelection && y instanceof SlotSelection
    ? x.toTplSlotSelection().equals(y.toTplSlotSelection())
    : x === y;
}
