import { OperationResult } from "@/wab/client/operations/common";
import { getComponentArgFromHtmlProp } from "@/wab/client/operations/html-to-tpl";
import { TplMgr } from "@/wab/shared/TplMgr";
import { TplComponent, VariantSetting } from "@/wab/shared/model/classes";

export type SetComponentInstancePropResult = OperationResult<{}>;

/**
 * Set a single prop (or variant selection) on a component instance, under
 * the given variant setting of the containing component.
 */
export function setComponentInstanceProp(
  tpl: TplComponent,
  propName: string,
  value: unknown,
  opts: {
    vs: VariantSetting;
    tplMgr: TplMgr;
  }
): SetComponentInstancePropResult {
  const { vs, tplMgr } = opts;
  const component = tpl.component;

  try {
    const [param, expr] = getComponentArgFromHtmlProp(
      component,
      component.name,
      propName,
      value
    );
    tplMgr.setArg(tpl, vs, param.variable, expr);
    return { result: "success" };
  } catch (err) {
    return {
      result: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
