import { SelectOptionRef } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultSelect__OptionProps,
  PlasmicSelect__Option,
} from "./plasmic/plume_main/PlasmicSelect__Option";

interface Select__OptionProps extends DefaultSelect__OptionProps {}

function Select__Option_(props: Select__OptionProps, ref: SelectOptionRef) {
  const { plasmicProps } = PlasmicSelect__Option.useBehavior(props, ref);
  return <PlasmicSelect__Option {...plasmicProps} />;
}

export default React.forwardRef(Select__Option_);
