import { observer } from "mobx-react";
import React from "react";
import CloseIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Close";
import ColumnAlignBaselineIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnAlignBaseline";
import ColumnAlignCenterIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnAlignCenter";
import ColumnAlignEndIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnAlignEnd";
import ColumnAlignStartIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnAlignStart";
import ColumnAlignStretchIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnAlignStretch";
import RowAlignBaselineIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowAlignBaseline";
import RowAlignCenterIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowAlignCenter";
import RowAlignEndIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowAlignEnd";
import RowAlignStartIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowAlignStart";
import RowAlignStretchIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowAlignStretch";
import { LabeledToggleButtonGroupItemRow } from "../sidebar/sidebar-helpers";
import { Icon } from "../widgets/Icon";
import { StyleComponent, StyleComponentProps } from "./StyleComponent";
import StyleToggleButton from "./StyleToggleButton";

export const AlignItemsControls = observer(
  class extends StyleComponent<
    StyleComponentProps & {
      prop: "align-items" | "align-self" | "justify-self" | "justify-items";
      dir: string;
      includeAuto: boolean;
      isFlex: boolean;
      label?: React.ReactNode;
    }
  > {
    render() {
      const { prop, dir, includeAuto, label, isFlex } = this.props;
      const options = [
        ...(includeAuto ? ["auto"] : []),
        "flex-start",
        "center",
        "flex-end",
        "stretch",
        "baseline",
      ];
      return (
        <LabeledToggleButtonGroupItemRow
          styleName={prop}
          label={label}
          styleType="between"
        >
          {options.map((option) => (
            <StyleToggleButton value={option} key={option}>
              <Icon icon={alignItemsIcons[dir][option]} />
            </StyleToggleButton>
          ))}
        </LabeledToggleButtonGroupItemRow>
      );
    }
  }
);

// TODO fix icons when introducing grid
export const alignItemsIcons = {
  row: {
    auto: CloseIcon,
    "flex-start": RowAlignStartIcon,
    center: RowAlignCenterIcon,
    "flex-end": RowAlignEndIcon,
    stretch: RowAlignStretchIcon,
    baseline: RowAlignBaselineIcon,
  },
  column: {
    auto: CloseIcon,
    "flex-start": ColumnAlignStartIcon,
    center: ColumnAlignCenterIcon,
    "flex-end": ColumnAlignEndIcon,
    stretch: ColumnAlignStretchIcon,
    baseline: ColumnAlignBaselineIcon,
  },
  "row-reverse": {
    auto: CloseIcon,
    "flex-start": RowAlignEndIcon,
    center: RowAlignCenterIcon,
    "flex-end": RowAlignStartIcon,
    stretch: RowAlignStretchIcon,
    baseline: RowAlignBaselineIcon,
  },
  "column-reverse": {
    auto: CloseIcon,
    "flex-start": ColumnAlignEndIcon,
    center: ColumnAlignCenterIcon,
    "flex-end": ColumnAlignStartIcon,
    stretch: ColumnAlignStretchIcon,
    baseline: ColumnAlignBaselineIcon,
  },
};
