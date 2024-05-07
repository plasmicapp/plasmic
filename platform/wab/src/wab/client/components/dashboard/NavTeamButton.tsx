import { PublicLink } from "@/wab/client/components/PublicLink";
import {
  DefaultNavTeamButtonProps,
  PlasmicNavTeamButton,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicNavTeamButton";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

type NavTeamButtonProps = DefaultNavTeamButtonProps;

function NavTeamButton_(props: NavTeamButtonProps, ref: HTMLElementRefOf<"a">) {
  return <PlasmicNavTeamButton root={{ as: PublicLink, ref }} {...props} />;
}

const NavTeamButton = React.forwardRef(NavTeamButton_);
export default NavTeamButton;
