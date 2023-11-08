import { observer } from "mobx-react";
import React from "react";
import { cx } from "../../../common";
import {
  flexDirToArrangement,
  isFlexReverse,
} from "../../../shared/layoututils";
import ColumnWrapCenterIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnWrapCenter";
import ColumnWrapEndIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnWrapEnd";
import ColumnWrapReverseCenterIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnWrapReverseCenter";
import ColumnWrapReverseEndIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnWrapReverseEnd";
import ColumnWrapReverseSpaceBetweenIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnWrapReverseSpaceBetween";
import ColumnWrapReverseSpaceEvenlyIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnWrapReverseSpaceEvenly";
import ColumnWrapReverseStartIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnWrapReverseStart";
import ColumnWrapReverseStretchIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnWrapReverseStretch";
import ColumnWrapSpaceBetweenIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnWrapSpaceBetween";
import ColumnWrapSpaceEvenlyIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnWrapSpaceEvenly";
import ColumnWrapStartIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnWrapStart";
import ColumnWrapStretchIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ColumnWrapStretch";
import RowWrapCenterIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowWrapCenter";
import RowWrapEndIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowWrapEnd";
import RowWrapReverseCenterIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowWrapReverseCenter";
import RowWrapReverseEndIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowWrapReverseEnd";
import RowWrapReverseSpaceBetweenIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowWrapReverseSpaceBetween";
import RowWrapReverseSpaceEvenlyIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowWrapReverseSpaceEvenly";
import RowWrapReverseStartIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowWrapReverseStart";
import RowWrapReverseStretchIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowWrapReverseStretch";
import RowWrapSpaceBetweenIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowWrapSpaceBetween";
import RowWrapSpaceEvenlyIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowWrapSpaceEvenly";
import RowWrapStartIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowWrapStart";
import RowWrapStretchIcon from "../../plasmic/plasmic_kit/PlasmicIcon__RowWrapStretch";
import { LabeledToggleButtonGroup } from "../sidebar/sidebar-helpers";
import { Icon } from "../widgets/Icon";
import { StyleComponent, StyleComponentProps } from "./StyleComponent";
import StyleToggleButton from "./StyleToggleButton";

class AlignContentControls_ extends StyleComponent<StyleComponentProps> {
  render() {
    // currently flexDir can only be row/column, not -reverse
    const flexDir = this.exp().get("flexDirection");
    const flexWrap = this.exp().get("flexWrap");

    // TODO: shouldn't use flexAxis to index into icons, and icons
    // will change depending on whether flexDir is reverse or not.
    // Quick fix to unblock
    const flexAxis = flexDirToArrangement(flexDir);
    const isFlexReversed = isFlexReverse(flexDir);
    const alignContents = [
      "flex-start",
      "center",
      "flex-end",
      "stretch",
      "space-between",
      "space-evenly",
    ];
    return (
      <LabeledToggleButtonGroup styleName="align-content">
        {alignContents.map((value) => (
          <StyleToggleButton className="flex-fill" value={value}>
            <Icon
              className={cx({
                "flip-horiz": flexAxis === "row" && isFlexReversed,
                "flip-vert": flexAxis === "column" && isFlexReversed,
              })}
              icon={icons[flexAxis][flexWrap][value]}
            />
          </StyleToggleButton>
        ))}
      </LabeledToggleButtonGroup>
    );
  }
}

const icons = {
  row: {
    wrap: {
      "flex-start": RowWrapStartIcon,
      center: RowWrapCenterIcon,
      "flex-end": RowWrapEndIcon,
      stretch: RowWrapStretchIcon,
      "space-between": RowWrapSpaceBetweenIcon,
      "space-evenly": RowWrapSpaceEvenlyIcon,
    },
    "wrap-reverse": {
      "flex-start": RowWrapReverseStartIcon,
      center: RowWrapReverseCenterIcon,
      "flex-end": RowWrapReverseEndIcon,
      stretch: RowWrapReverseStretchIcon,
      "space-between": RowWrapReverseSpaceBetweenIcon,
      "space-evenly": RowWrapReverseSpaceEvenlyIcon,
    },
  },
  column: {
    wrap: {
      "flex-start": ColumnWrapStartIcon,
      center: ColumnWrapCenterIcon,
      "flex-end": ColumnWrapEndIcon,
      stretch: ColumnWrapStretchIcon,
      "space-between": ColumnWrapSpaceBetweenIcon,
      "space-evenly": ColumnWrapSpaceEvenlyIcon,
    },
    "wrap-reverse": {
      "flex-start": ColumnWrapReverseStartIcon,
      center: ColumnWrapReverseCenterIcon,
      "flex-end": ColumnWrapReverseEndIcon,
      stretch: ColumnWrapReverseStretchIcon,
      "space-between": ColumnWrapReverseSpaceBetweenIcon,
      "space-evenly": ColumnWrapReverseSpaceEvenlyIcon,
    },
  },
};

export const AlignContentControls = observer(AlignContentControls_);
