import * as React from "react";
import {
  DefaultStyleSelect__OptionGroupProps,
  PlasmicStyleSelect__OptionGroup,
} from "../../plasmic/plasmic_kit_style_controls/PlasmicStyleSelect__OptionGroup";

interface StyleSelect__OptionGroupProps
  extends DefaultStyleSelect__OptionGroupProps {}

function StyleSelect__OptionGroup(props: StyleSelect__OptionGroupProps) {
  const { plasmicProps } = PlasmicStyleSelect__OptionGroup.useBehavior(props);
  return <PlasmicStyleSelect__OptionGroup {...plasmicProps} />;
}

export default Object.assign(StyleSelect__OptionGroup, {
  __plumeType: "select-option-group",
});
