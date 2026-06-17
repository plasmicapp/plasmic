import { OperationResult } from "@/wab/client/operations/common";
import { isSlot } from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { paramToVarName, toVarName } from "@/wab/shared/codegen/util";
import { TplComponent, VariantSetting } from "@/wab/shared/model/classes";

export type UnsetComponentInstancePropResult = OperationResult<{}>;

/**
 * Unset a single prop on a component instance under the given variant
 * setting, reverting it to the component's default.
 * Unsetting an already-unset prop is a no-op.
 */
export function unsetComponentInstanceProp(
  tpl: TplComponent,
  propName: string,
  opts: {
    vs: VariantSetting;
    tplMgr: TplMgr;
  }
): UnsetComponentInstancePropResult {
  const { vs, tplMgr } = opts;
  const component = tpl.component;

  const varName = toVarName(propName);
  const param = component.params.find(
    (p) => paramToVarName(component, p) === varName
  );
  if (!param) {
    return {
      result: "error",
      message: `Component "${component.name}" has no prop "${propName}"`,
    };
  }
  if (isSlot(param)) {
    return {
      result: "error",
      message: `Component "${component.name}" prop "${propName}" is a slot.`,
    };
  }

  tplMgr.tryDelArg(tpl, vs, param.variable);
  return { result: "success" };
}
