import * as React from "react";
import {
  PlasmicSelect__Option,
  DefaultSelect__OptionProps
} from "./plasmic/plume_main/PlasmicSelect__Option";
import { SelectOptionRef } from "@plasmicapp/react-web";

interface Select__OptionProps extends DefaultSelect__OptionProps {}

function Select__Option_(props: Select__OptionProps, ref: SelectOptionRef) {
  const { plasmicProps } = PlasmicSelect__Option.useBehavior(props, ref);
  return <PlasmicSelect__Option {...plasmicProps} />;
}

export default React.forwardRef(Select__Option_);
