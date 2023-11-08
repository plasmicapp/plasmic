import { SelectRef } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultSelectProps,
  PlasmicSelect,
} from "../../plasmic/plasmic_kit_design_system/PlasmicSelect";
import { useTestableSelect } from "../../utils/testable-controls";
import Option from "./Select__Option";
import OptionGroup from "./Select__OptionGroup";

interface SelectProps extends DefaultSelectProps {}

function Select_(props: SelectProps, ref: SelectRef) {
  const { plasmicProps, state } = PlasmicSelect.useBehavior(props, ref);
  useTestableSelect(props);
  return <PlasmicSelect {...plasmicProps} />;
}

const Select = React.forwardRef(Select_);

export default Object.assign(Select, {
  Option,
  OptionGroup,
  __plumeType: "select",
});
