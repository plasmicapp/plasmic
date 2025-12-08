import Option from "@/wab/client/components/widgets/Select__Option";
import OptionGroup from "@/wab/client/components/widgets/Select__OptionGroup";
import {
  DefaultSelectProps,
  PlasmicSelect,
} from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicSelect";
import { SelectRef } from "@plasmicapp/react-web";
import * as React from "react";

type SelectProps = DefaultSelectProps;

function Select_(props: SelectProps, ref: SelectRef) {
  const { plasmicProps, state: _state } = PlasmicSelect.useBehavior(props, ref);
  return <PlasmicSelect {...plasmicProps} />;
}

const Select = React.forwardRef(Select_);

export default Object.assign(Select, {
  Option,
  OptionGroup,
  __plumeType: "select",
});
