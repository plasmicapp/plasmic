import { observer } from "mobx-react-lite";
import React from "react";
import { isKnownTplComponent, TplNode } from "../../../classes";
import { assert } from "../../../common";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { TplExpsProvider } from "../style-controls/StyleComponent";
import { RepeaterPropsTooltip } from "../widgets/DetailedTooltips";
import { LabelWithDetailedTooltip } from "../widgets/LabelWithDetailedTooltip";
import { ComponentPropsSection } from "./ComponentPropsSection";

export const RepeaterSection = observer(function (props: {
  tpl: TplNode;
  viewCtx: ViewCtx;
}) {
  const { tpl, viewCtx } = props;

  assert(
    isKnownTplComponent(tpl.parent),
    "RepeaterSection should only be used in children of Repeater components"
  );

  return (
    <ComponentPropsSection
      viewCtx={viewCtx}
      tpl={tpl.parent}
      customTitle={
        <LabelWithDetailedTooltip tooltip={<RepeaterPropsTooltip />}>
          Repeater Props
        </LabelWithDetailedTooltip>
      }
      expsProvider={new TplExpsProvider(viewCtx, tpl.parent)}
      tab="settings"
    />
  );
});
