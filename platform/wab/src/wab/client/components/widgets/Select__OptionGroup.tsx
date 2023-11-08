import * as React from "react";
import {
  DefaultSelect__OptionGroupProps,
  PlasmicSelect__OptionGroup,
} from "../../plasmic/plasmic_kit_design_system/PlasmicSelect__OptionGroup";

interface Select__OptionGroupProps extends DefaultSelect__OptionGroupProps {}

function Select__OptionGroup(props: Select__OptionGroupProps) {
  const { plasmicProps } = PlasmicSelect__OptionGroup.useBehavior(props);
  return <PlasmicSelect__OptionGroup {...plasmicProps} />;
}

export default Object.assign(Select__OptionGroup, {
  __plumeType: "select-option-group",
});
