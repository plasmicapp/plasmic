import {
  DefaultStyleSelect__OptionGroupProps,
  PlasmicStyleSelect__OptionGroup,
} from "@/wab/client/plasmic/plasmic_kit_style_controls/PlasmicStyleSelect__OptionGroup";
import * as React from "react";

type StyleSelect__OptionGroupProps = DefaultStyleSelect__OptionGroupProps;

function StyleSelect__OptionGroup(props: StyleSelect__OptionGroupProps) {
  const { plasmicProps } = PlasmicStyleSelect__OptionGroup.useBehavior(props);
  return <PlasmicStyleSelect__OptionGroup {...plasmicProps} />;
}

export default Object.assign(StyleSelect__OptionGroup, {
  __plumeType: "select-option-group",
});
