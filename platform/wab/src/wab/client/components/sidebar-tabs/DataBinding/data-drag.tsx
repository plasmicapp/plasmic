import { DataDragTargeting } from "@/wab/client/Dnd";
import { variableTypeToIcon } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import {
  COMPONENT_SCOPED_ROOTS,
  DataDragPayload,
  canUseDataDragPath,
} from "@/wab/client/components/sidebar-tabs/DataBinding/data-drop";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { AddItemType, AddTplItem } from "@/wab/client/definitions/insertables";
import { ViewCtx, ensureBaseRs } from "@/wab/client/studio-ctx/view-ctx";
import { AddItemKey } from "@/wab/shared/add-item-keys";
import { toVarName } from "@/wab/shared/codegen/util";
import { uniqueName } from "@/wab/shared/common";
import { mkNormalizedRep } from "@/wab/shared/copilot/utils";
import { code, codeLit } from "@/wab/shared/core/exprs";
import { mkVar } from "@/wab/shared/core/lang";
import {
  flattenTpls,
  hasChildrenSlot,
  isTplContainer,
  isTplTextBlock,
} from "@/wab/shared/core/tpls";
import { ValComponent, ValTag } from "@/wab/shared/core/val-nodes";
import { SCALAR_DATA_TYPES } from "@/wab/shared/data-picker/data-drop-compat";
import {
  DataPickerSupportedVariableType,
  dataPickerShouldHideKey,
  getVariableType,
} from "@/wab/shared/data-picker/data-picker-types";
import { getSimplifiedStyles } from "@/wab/shared/default-styles";
import {
  isPathDataToken,
  pathToString,
} from "@/wab/shared/eval/expression-parser";
import {
  ExprText,
  ObjectPath,
  TplNode,
  isKnownExprText,
  isKnownObjectPath,
  isKnownTplComponent,
} from "@/wab/shared/model/classes";
import * as React from "react";

/** How many scalar fields an object/list-of-objects scaffold binds. */
const MAX_SCAFFOLD_FIELDS = 5;
const MAX_SCAFFOLD_DEPTH = 3;

export function isDraggableDataItem(varType: DataPickerSupportedVariableType) {
  return varType !== "function";
}

/** Ad-hoc insert-panel spec for dragging a data picker row onto the canvas. */
export function mkDataDragSpec(payload: DataDragPayload): AddTplItem {
  const name = payload.label;
  return {
    type: AddItemType.tpl,
    key: `data-drag-${pathToString(payload.path)}`,
    label: name,
    displayLabel: payload.previewValue
      ? `${name}: ${
          payload.previewValue.length > 24
            ? payload.previewValue.slice(0, 24) + "…"
            : payload.previewValue
        }`
      : name,
    icon: <Icon icon={variableTypeToIcon(payload.varType)} />,
    onInserted: fixRepVarShadowing,
    factory: (vc: ViewCtx) =>
      // The dragged path only resolves in its own component.
      vc.currentComponent() === payload.sourceViewCtx.currentComponent()
        ? buildTplForDataValue(vc, payload)
        : undefined,
  };
}

export function mkDataDragTargeting(
  payload: DataDragPayload,
): DataDragTargeting {
  const varType = getVariableType(payload.value);
  const isScalar = SCALAR_DATA_TYPES.some((type) => type === varType);
  const root = String(payload.path[0]);
  const componentScoped =
    COMPONENT_SCOPED_ROOTS.has(root) || isPathDataToken(payload.path);
  return {
    path: payload.path,
    fallbackValue: payload.value,
    getBindTarget: (vc, sel, modifiers) => {
      if (!(sel instanceof ValTag || sel instanceof ValComponent)) {
        return undefined;
      }
      const tpl = sel.tpl;
      if (tpl === vc.currentComponent().tplTree) {
        // Never bind the root; keep the normal insert-into-root behavior.
        return undefined;
      }
      const containerLike =
        isTplContainer(tpl) ||
        (isKnownTplComponent(tpl) && hasChildrenSlot(tpl));
      if (containerLike) {
        // Alt forces binding the collection on the container itself.
        return varType === "array" && modifiers?.altKey
          ? { kind: "data-rep" }
          : undefined;
      }
      if (varType === "array") {
        return { kind: "data-rep" };
      }
      if (varType === "object") {
        return {
          error: {
            type: "CantBindData",
            message: "Pick a field inside this object",
          },
        };
      }
      if (isScalar) {
        return isTplTextBlock(tpl)
          ? { kind: "text-content" }
          : {
              error: {
                type: "CantBindData",
                message: "Drop onto a text element to bind its content",
              },
            };
      }
      return undefined;
    },
    isAvailable: (vc, tpl, where) => {
      if (vc.currentComponent() !== payload.sourceViewCtx.currentComponent()) {
        return false;
      }
      if (componentScoped) {
        return true;
      }
      const env = vc.getCanvasEnvForTpl(
        tpl,
        where === "outside" ? { forDataRepCollection: true } : undefined,
      );
      return canUseDataDragPath(payload, env, vc) === true;
    },
  };
}

/**
 * Creates the element a data drag inserts: a bound text for scalars, a repeated text/vstack for
 * arrays, and a vstack of bound texts for objects.
 */
export function buildTplForDataValue(
  vc: ViewCtx,
  payload: DataDragPayload,
): TplNode | undefined {
  const varType = getVariableType(payload.value);
  if (varType === "array") {
    const first = (payload.value as unknown[])[0];
    const collection = new ObjectPath({
      path: payload.path,
      fallback: code("([])"),
    });
    // Avoid shadowing repeat vars already in scope where the drag started.
    const element = uniqueName(payload.envKeys, "currentItem", {
      separator: "",
      normalize: toVarName,
    });
    const index = uniqueName([...payload.envKeys, element], "currentIndex", {
      separator: "",
      normalize: toVarName,
    });
    const rep = mkNormalizedRep(collection, element, index);
    const tpl =
      getVariableType(first) === "object"
        ? mkVStack(
            vc,
            scalarLeaves(first).map((leaf) =>
              mkDynamicText(vc, [element, ...leaf.path], leaf.value),
            ),
          )
        : mkDynamicText(vc, [element], first);
    vc.variantTplMgr().ensureBaseVariantSetting(tpl).dataRep = rep;
    return tpl;
  }
  if (varType === "object") {
    const leaves = scalarLeaves(payload.value);
    return leaves.length === 0
      ? undefined
      : mkVStack(
          vc,
          leaves.map((leaf) =>
            mkDynamicText(vc, [...payload.path, ...leaf.path], leaf.value),
          ),
        );
  }
  if (SCALAR_DATA_TYPES.some((type) => type === varType)) {
    return mkDynamicText(vc, payload.path, payload.value);
  }
  return undefined;
}

/**
 * Renames repeat vars of a dropped tpl that shadow bindings in scope at the drop target. Runs
 * inside the drop's change().
 */
export function fixRepVarShadowing(vc: ViewCtx, tpl: TplNode) {
  const baseVs = tpl.vsettings[0];
  const rep = baseVs?.dataRep;
  if (!rep) {
    return;
  }
  const env = vc.getCanvasEnvForTpl(tpl, { forDataRepCollection: true });
  if (!env) {
    return;
  }
  const envKeys = Object.keys(env);
  const oldElement = rep.element.name;
  const newElement = uniqueName(envKeys, oldElement, {
    separator: "",
    normalize: toVarName,
  });
  if (newElement !== oldElement) {
    rep.element = mkVar(newElement);
    for (const child of flattenTpls(tpl)) {
      for (const vs of child.vsettings) {
        const text = vs.text;
        if (
          isKnownExprText(text) &&
          isKnownObjectPath(text.expr) &&
          text.expr.path[0] === oldElement
        ) {
          text.expr.path = [newElement, ...text.expr.path.slice(1)];
        }
      }
    }
  }
  if (rep.index) {
    const newIndex = uniqueName([...envKeys, newElement], rep.index.name, {
      separator: "",
      normalize: toVarName,
    });
    if (newIndex !== rep.index.name) {
      rep.index = mkVar(newIndex);
    }
  }
}

/** The first few scalar leaves of `obj`, descending into nested objects. */
function scalarLeaves(
  obj: unknown,
  prefix: (string | number)[] = [],
  out: { path: (string | number)[]; value: unknown }[] = [],
) {
  if (
    getVariableType(obj) !== "object" ||
    prefix.length >= MAX_SCAFFOLD_DEPTH
  ) {
    return out;
  }
  const record = obj as Record<string, any>;
  for (const key of Object.keys(record)) {
    if (out.length >= MAX_SCAFFOLD_FIELDS) {
      break;
    }
    if (
      dataPickerShouldHideKey(key, record, undefined, {
        showAdvancedFields: false,
      })
    ) {
      continue;
    }
    const value = record[key];
    const path = [...prefix, key];
    if (SCALAR_DATA_TYPES.some((type) => type === getVariableType(value))) {
      out.push({ path, value });
    } else {
      scalarLeaves(value, path, out);
    }
  }
  return out;
}

function mkDynamicText(
  vc: ViewCtx,
  path: (string | number)[],
  fallbackValue: unknown,
) {
  const vtm = vc.variantTplMgr();
  const tag = vtm.mkTplInlinedText("", "div");
  vtm.ensureBaseVariantSetting(tag).text = new ExprText({
    expr: new ObjectPath({
      path,
      fallback:
        fallbackValue === null ||
        ["string", "number", "boolean"].includes(typeof fallbackValue)
          ? codeLit(fallbackValue as string | number | boolean | null)
          : undefined,
    }),
    html: false,
  });
  ensureBaseRs(vc, tag, {
    position: "relative",
    ...getSimplifiedStyles(AddItemKey.text, vc.studioCtx.getAddItemPrefs()),
  });
  return tag;
}

function mkVStack(vc: ViewCtx, children: TplNode[]) {
  const vtm = vc.variantTplMgr();
  const stack = vtm.mkTplTagX("div", {}, children);
  ensureBaseRs(vc, stack, {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    ...getSimplifiedStyles(AddItemKey.vstack, vc.studioCtx.getAddItemPrefs()),
  });
  return stack;
}
