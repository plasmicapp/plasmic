import {
  DefaultOmnibarTabHeaderProps,
  PlasmicOmnibarTabHeader,
} from "@/wab/client/plasmic/plasmic_kit_omnibar/PlasmicOmnibarTabHeader";
import * as React from "react";

type OmnibarTabHeaderProps = DefaultOmnibarTabHeaderProps;

function OmnibarTabHeader(props: OmnibarTabHeaderProps) {
  return <PlasmicOmnibarTabHeader {...props} />;
}

export default OmnibarTabHeader;
