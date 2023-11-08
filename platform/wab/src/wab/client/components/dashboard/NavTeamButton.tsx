import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultNavTeamButtonProps,
  PlasmicNavTeamButton,
} from "../../plasmic/plasmic_kit_dashboard/PlasmicNavTeamButton";
import { PublicLink } from "../PublicLink";

interface NavTeamButtonProps extends DefaultNavTeamButtonProps {}

function NavTeamButton_(props: NavTeamButtonProps, ref: HTMLElementRefOf<"a">) {
  return <PlasmicNavTeamButton root={{ as: PublicLink, ref }} {...props} />;
}

const NavTeamButton = React.forwardRef(NavTeamButton_);
export default NavTeamButton;
