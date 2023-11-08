import * as React from "react";
import {
  DefaultOmnibarCommandItemProps,
  PlasmicOmnibarCommandItem,
} from "../../plasmic/plasmic_kit_omnibar/PlasmicOmnibarCommandItem";

interface OmnibarCommandItemProps extends DefaultOmnibarCommandItemProps {}

const OmnibarCommandItem = React.forwardRef(function (
  props: OmnibarCommandItemProps,
  ref
) {
  return <PlasmicOmnibarCommandItem {...props} />;
});

export default OmnibarCommandItem;
