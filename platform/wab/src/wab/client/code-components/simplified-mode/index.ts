import type { CodeComponentMode } from "@plasmicapp/host";
import {
  executePlasmicDataOp,
  normalizeData,
} from "@plasmicapp/react-web/lib/data-sources";
import { formComponentName } from "@plasmicpkgs/antd5";
import { Param, TplComponent } from "../../../classes";
import { assert } from "../../../common";
import { codeLit } from "../../../exprs";
import { ensureBaseVariantSetting } from "../../../shared/Variants";
import { isTplCodeComponent } from "../../../tpls";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { updateFormComponentMode } from "./Forms";

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
