import { LabeledToggleButtonGroupItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import { Icon } from "@/wab/client/components/widgets/Icon";
import BorderDashedIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__BorderDashed";
import BorderDottedIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__BorderDotted";
import BorderSolidIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__BorderSolid";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import React from "react";

export function LabeledLineStyleToggleButtonGroupItemRow(
  props: Omit<
    React.ComponentProps<typeof LabeledToggleButtonGroupItemRow>,
    "children"
  >
) {
  return (
    <LabeledToggleButtonGroupItemRow {...props}>
      <StyleToggleButton
        className="panel-popup--no-min-width"
        value="none"
        stretched
      >
        <Icon icon={CloseIcon} />
      </StyleToggleButton>
      <StyleToggleButton
        className="panel-popup--no-min-width"
        value="dotted"
        stretched
      >
        <Icon icon={BorderDottedIcon} />
      </StyleToggleButton>
      <StyleToggleButton
        className="panel-popup--no-min-width"
        value="dashed"
        stretched
      >
        <Icon icon={BorderDashedIcon} />
      </StyleToggleButton>
      <StyleToggleButton
        className="panel-popup--no-min-width"
        value="solid"
        stretched
      >
        <Icon icon={BorderSolidIcon} />
      </StyleToggleButton>
    </LabeledToggleButtonGroupItemRow>
  );
}
