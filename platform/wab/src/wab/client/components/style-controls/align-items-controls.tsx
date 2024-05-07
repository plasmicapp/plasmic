import { LabeledToggleButtonGroupItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  StyleComponent,
  StyleComponentProps,
} from "@/wab/client/components/style-controls/StyleComponent";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import { Icon } from "@/wab/client/components/widgets/Icon";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import ColumnAlignBaselineIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ColumnAlignBaseline";
import ColumnAlignCenterIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ColumnAlignCenter";
import ColumnAlignEndIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ColumnAlignEnd";
import ColumnAlignStartIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ColumnAlignStart";
import ColumnAlignStretchIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ColumnAlignStretch";
import RowAlignBaselineIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__RowAlignBaseline";
import RowAlignCenterIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__RowAlignCenter";
import RowAlignEndIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__RowAlignEnd";
import RowAlignStartIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__RowAlignStart";
import RowAlignStretchIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__RowAlignStretch";
import { observer } from "mobx-react";
import React from "react";

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
