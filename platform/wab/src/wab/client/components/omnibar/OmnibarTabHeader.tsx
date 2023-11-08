import * as React from "react";
import {
  DefaultOmnibarTabHeaderProps,
  PlasmicOmnibarTabHeader,
} from "../../plasmic/plasmic_kit_omnibar/PlasmicOmnibarTabHeader";

interface OmnibarTabHeaderProps extends DefaultOmnibarTabHeaderProps {}

function OmnibarTabHeader(props: OmnibarTabHeaderProps) {
  return <PlasmicOmnibarTabHeader {...props} />;
}

export default OmnibarTabHeader;
