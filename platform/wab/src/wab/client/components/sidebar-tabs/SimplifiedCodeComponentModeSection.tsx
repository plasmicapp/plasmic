import { getControlModePropType } from "@/wab/client/code-components/code-components";
import { updateComponentMode } from "@/wab/client/code-components/simplified-mode";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import StyleSwitch from "@/wab/client/components/style-controls/StyleSwitch";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import { ensure, spawn } from "@/wab/shared/common";
import { tryExtractJson } from "@/wab/shared/core/exprs";
import { getTplComponentArg } from "@/wab/shared/TplMgr";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import { Expr, TplComponent } from "@/wab/shared/model/classes";
import type { CodeComponentMode } from "@plasmicapp/host";
import { observer } from "mobx-react";
import React from "react";

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
