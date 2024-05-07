import {
  DefaultSelect__OptionProps,
  PlasmicSelect__Option,
} from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicSelect__Option";
import { SelectOptionRef } from "@plasmicapp/react-web";
import * as React from "react";

type Select__OptionProps = DefaultSelect__OptionProps;

function Select__Option_(props: Select__OptionProps, ref: SelectOptionRef) {
  const { plasmicProps } = PlasmicSelect__Option.useBehavior(props, ref);
  return (
    <PlasmicSelect__Option
      isUnsetOption={props.value == null}
      {...plasmicProps}
    />
  );
}

const Select__Option = React.forwardRef(Select__Option_);

export default Object.assign(Select__Option, {
  __plumeType: "select-option",
});
