import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultNavTeamSectionProps,
  PlasmicNavTeamSection,
} from "../../plasmic/plasmic_kit_dashboard/PlasmicNavTeamSection";

interface NavTeamSectionProps extends DefaultNavTeamSectionProps {
  freeTrial?: boolean;
}

function NavTeamSection_(
  { freeTrial, ...props }: NavTeamSectionProps,
  ref: HTMLElementRefOf<"div">
) {
  return (
    <PlasmicNavTeamSection
      root={{ ref }}
      button={{
        props: {
          freeTrial,
        },
      }}
      {...props}
    />
  );
}

const NavTeamSection = React.forwardRef(NavTeamSection_);
export default NavTeamSection;
