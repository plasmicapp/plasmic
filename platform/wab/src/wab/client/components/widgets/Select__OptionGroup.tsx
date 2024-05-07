import {
  DefaultSelect__OptionGroupProps,
  PlasmicSelect__OptionGroup,
} from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicSelect__OptionGroup";
import * as React from "react";

type Select__OptionGroupProps = DefaultSelect__OptionGroupProps;

function Select__OptionGroup(props: Select__OptionGroupProps) {
  const { plasmicProps } = PlasmicSelect__OptionGroup.useBehavior(props);
  return <PlasmicSelect__OptionGroup {...plasmicProps} />;
}

export default Object.assign(Select__OptionGroup, {
  __plumeType: "select-option-group",
});
