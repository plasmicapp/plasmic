import * as React from "react";
import {
  PlasmicSliderThumb,
} from "./plasmic/plain_kit/PlasmicSliderThumb";
import { PlumeSliderThumbProps, useSliderThumb, PlumeSliderThumbRef } from "@plasmicapp/plume";

interface SliderThumbProps extends PlumeSliderThumbProps {}

const SliderThumb = React.forwardRef(function SliderThumb(props: SliderThumbProps, ref: PlumeSliderThumbRef) {
  const {plumeProps, state} = useSliderThumb(
    PlasmicSliderThumb,
    props,
    {
      isDisabledVariant: ["isDisabled", "isDisabled"],
      isDraggingVariant: ["isDragging", "isDragging"],
      hasLabelVariant: ["hasLabel", "hasLabel"],
      root: "root",
      label: "labelContainer"
    },
    ref
  );
  return (
    <PlasmicSliderThumb
      {...plumeProps}
      tooltip={state.getThumbValueLabel(props.index)}
    />
  );
});

export default SliderThumb;
