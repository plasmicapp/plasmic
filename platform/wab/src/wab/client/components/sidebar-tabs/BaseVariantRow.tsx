import { VariantAnimations } from "@/wab/client/components/sidebar-tabs/VariantAnimations";
import { SelectorTags } from "@/wab/client/components/sidebar/RuleSetControls";
import VariantRow from "@/wab/client/components/variants/VariantRow";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { TplTag } from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import React from "react";

interface BaseVariantRowProps {
  tpl: TplTag;
  studioCtx: StudioCtx;
  viewCtx: ViewCtx;
  pinState: "selected-pinned" | undefined;
  onClick: () => void;
}

export const BaseVariantRow = observer(function BaseVariantRow(
  props: BaseVariantRowProps
) {
  const { tpl, studioCtx, viewCtx, pinState, onClick } = props;

  // Get the target RuleSet for the non-private variant combo
  const vtm = viewCtx.variantTplMgr();
  const variantCombo = vtm.getCurrentSharedVariantComboForNode(tpl);

  return (
    <VariantAnimations variants={variantCombo} tpl={tpl} viewCtx={viewCtx}>
      {({ addAnimationLayer, animationsList }) => (
        <VariantRow
          type={"baseVariant"}
          variant={variantCombo}
          studioCtx={studioCtx}
          viewCtx={viewCtx}
          pinState={pinState}
          onClick={onClick}
          addAnimationLayer={addAnimationLayer}
          additional={animationsList}
          label={
            <SelectorTags
              isCodeComponent={false}
              selectors={[{ type: "CssSelector", cssSelector: "Base" }]}
            />
          }
          hideIcon={true}
        />
      )}
    </VariantAnimations>
  );
});
