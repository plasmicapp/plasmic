import { getDataProps, SelectRef } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultSelectProps,
  PlasmicSelect,
} from "../plasmic/plume_main/PlasmicSelect";
import Option from "./Select__Option";
import OptionGroup from "./Select__OptionGroup";

interface SelectProps extends DefaultSelectProps {}

function Select_(props: SelectProps, ref: SelectRef) {
  const { plasmicProps, state } = PlasmicSelect.useBehavior(props, ref);
  return <PlasmicSelect {...plasmicProps} trigger={getDataProps(props)} />;
}

const Select = React.forwardRef(Select_);

export default Object.assign(Select, {
  Option,
  OptionGroup,
  __plumeType: "select",
});
