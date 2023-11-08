import type { CodeComponentMode } from "@plasmicapp/host";
import { observer } from "mobx-react-lite";
import React from "react";
import { Expr, TplComponent } from "../../../classes";
import { ensure, spawn } from "../../../common";
import { tryExtractJson } from "../../../exprs";
import { getTplComponentArg } from "../../../shared/TplMgr";
import { ensureBaseVariantSetting } from "../../../shared/Variants";
import { getControlModePropType } from "../../code-components/code-components";
import { updateComponentMode } from "../../code-components/simplified-mode";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { TutorialEventsType } from "../../tours/tutorials/tutorials-events";
import { SidebarSection } from "../sidebar/SidebarSection";
import StyleSwitch from "../style-controls/StyleSwitch";

export const SimplifiedCodeComponentModeSection = observer(function (props: {
  tpl: TplComponent;
  viewCtx: ViewCtx;
}) {
  const { tpl, viewCtx } = props;

  const baseVs = ensureBaseVariantSetting(tpl);
  const { propName } = ensure(
    getControlModePropType(viewCtx, tpl.component),
    `missing the control mode prop type for the component ${tpl.component.name}`
  );
  const param = ensure(
    tpl.component.params.find((p) => p.variable.name === propName),
    "component should have a mode param"
  );
  const modeArg = getTplComponentArg(tpl, baseVs, param.variable);
  const getMode = (modeExpr: Expr | undefined) =>
    modeExpr
      ? tryExtractJson(modeExpr)
      : param.defaultExpr
      ? tryExtractJson(param.defaultExpr)
      : undefined;

  const onChange = async (newMode: CodeComponentMode) => {
    await updateComponentMode(tpl, viewCtx, param, newMode);
    viewCtx.studioCtx.tourActionEvents.dispatch({
      type: TutorialEventsType.TurnedFormToSimplified,
    });
  };
  return (
    <SidebarSection title="Component mode" id="component-mode-section">
      <StyleSwitch
        isChecked={getMode(modeArg?.expr) === "simplified"}
        onChange={(value) => spawn(onChange(value ? "simplified" : "advanced"))}
        data-plasmic-prop="simplified-mode-toggle"
      >
        Simplified
      </StyleSwitch>
    </SidebarSection>
  );
});
