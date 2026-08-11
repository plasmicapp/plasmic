import { getComponentArgFromHtmlProp } from "@/wab/client/operations/html-to-tpl";
import { formatWIError } from "@/wab/client/web-importer/errors";
import { TplMgr } from "@/wab/shared/TplMgr";
import { GenericError } from "@/wab/shared/error-handling";
import { TplComponent, VariantSetting } from "@/wab/shared/model/classes";
import { Result } from "neverthrow";

export type SetComponentInstancePropResult = Result<void, GenericError>;

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

  return getComponentArgFromHtmlProp(component, component.name, propName, value)
    .map(([param, expr]) => {
      tplMgr.setArg(tpl, vs, param.variable, expr);
    })
    .mapErr((error) => ({ message: formatWIError(error) }));
}
