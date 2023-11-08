import { observer } from "mobx-react";
import React from "react";
import ColumnJustifyCenterIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnJustifyCenter";
import ColumnJustifyEndIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnJustifyEnd";
import ColumnJustifySpaceBetweenIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnJustifySpaceBetween";
import ColumnJustifyStartIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnJustifyStart";
import RowJustifyCenterIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowJustifyCenter";
import RowJustifyEndIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowJustifyEnd";
import RowJustifySpaceBetweenIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowJustifySpaceBetween";
import RowJustifyStartIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowJustifyStart";
import ColumnJustifySpaceEvenlyIcon from "../../plasmic/plasmic_kit_design_system/PlasmicIcon__ColumnJustifySpaceEvenly";
import RowJustifySpaceEvenlyIcon from "../../plasmic/plasmic_kit_design_system/PlasmicIcon__RowJustifySpaceEvenly";
import { LabeledToggleButtonGroup } from "../sidebar/sidebar-helpers";
import { Icon } from "../widgets/Icon";
import { StyleComponent, StyleComponentProps } from "./StyleComponent";
import StyleToggleButton from "./StyleToggleButton";

class JustifyContentControls_ extends StyleComponent<StyleComponentProps> {
  render() {
    const flexDir = this.exp().get("flexDirection");
    const options = [
      "flex-start",
      "center",
      "flex-end",
      "space-between",
      "space-evenly",
    ];
    return (
      <LabeledToggleButtonGroup styleName="justify-content">
        {options.map((option) => (
          <StyleToggleButton className="flex-fill" value={option} key={option}>
            <Icon icon={JustifyContentIcons[flexDir][option]} />
          </StyleToggleButton>
        ))}
      </LabeledToggleButtonGroup>
    );
  }
}

export const JustifyControls = observer(JustifyContentControls_);

export const JustifyContentIcons = {
  row: {
    "flex-start": RowJustifyStartIcon,
    center: RowJustifyCenterIcon,
    "flex-end": RowJustifyEndIcon,
    "space-between": RowJustifySpaceBetweenIcon,
    "space-evenly": RowJustifySpaceEvenlyIcon,
  },
  column: {
    "flex-start": ColumnJustifyStartIcon,
    center: ColumnJustifyCenterIcon,
    "flex-end": ColumnJustifyEndIcon,
    "space-between": ColumnJustifySpaceBetweenIcon,
    "space-evenly": ColumnJustifySpaceEvenlyIcon,
  },
  "row-reverse": {
    "flex-start": RowJustifyEndIcon,
    center: RowJustifyCenterIcon,
    "flex-end": RowJustifyStartIcon,
    "space-between": RowJustifySpaceBetweenIcon,
    "space-evenly": RowJustifySpaceEvenlyIcon,
  },
  "column-reverse": {
    "flex-start": ColumnJustifyEndIcon,
    center: ColumnJustifyCenterIcon,
    "flex-end": ColumnJustifyStartIcon,
    "space-between": ColumnJustifySpaceBetweenIcon,
    "space-evenly": ColumnJustifySpaceEvenlyIcon,
  },
};
