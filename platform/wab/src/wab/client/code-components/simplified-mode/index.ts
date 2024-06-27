import { updateFormComponentMode } from "@/wab/client/code-components/simplified-mode/Forms";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { assert } from "@/wab/shared/common";
import { codeLit } from "@/wab/shared/core/exprs";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import { Param, TplComponent } from "@/wab/shared/model/classes";
import { isTplCodeComponent } from "@/wab/shared/core/tpls";
import type { CodeComponentMode } from "@plasmicapp/host";
import {
  executePlasmicDataOp,
  normalizeData,
} from "@plasmicapp/react-web/lib/data-sources";
import { formComponentName } from "@plasmicpkgs/antd5";

export async function updateComponentMode(
  tpl: TplComponent,
  viewCtx: ViewCtx,
  modeParam: Param,
  newMode: CodeComponentMode
) {
  const tplMgr = viewCtx.studioCtx.tplMgr();
  const baseVs = ensureBaseVariantSetting(tpl);
  if (tpl.component.name === formComponentName) {
    assert(isTplCodeComponent(tpl), "tpl form should be a tpl code component");
    // We need to execute the plasmic data operation here because the viewCtx.change function
    // should be synchronous.
    const { componentPropValues } =
      viewCtx.getComponentPropValuesAndContextData(tpl);
    const dataOp = componentPropValues.data;
    const maybeRawData = dataOp
      ? await executePlasmicDataOp(dataOp)
      : undefined;
    const data = normalizeData(maybeRawData);
    viewCtx.change(() => {
      tplMgr.setArg(tpl, baseVs, modeParam.variable, codeLit(newMode));
      updateFormComponentMode(tpl, viewCtx, newMode, data);
    });
  }
}
