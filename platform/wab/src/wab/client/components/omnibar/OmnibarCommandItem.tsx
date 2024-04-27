import {
  DefaultOmnibarCommandItemProps,
  PlasmicOmnibarCommandItem,
} from "@/wab/client/plasmic/plasmic_kit_omnibar/PlasmicOmnibarCommandItem";
import * as React from "react";

type OmnibarCommandItemProps = DefaultOmnibarCommandItemProps;

const OmnibarCommandItem = React.forwardRef(function (
  props: OmnibarCommandItemProps,
  ref
) {
  return <PlasmicOmnibarCommandItem {...props} />;
});

export default OmnibarCommandItem;
