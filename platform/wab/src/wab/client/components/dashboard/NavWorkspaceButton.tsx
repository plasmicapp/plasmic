import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultNavWorkspaceButtonProps,
  PlasmicNavWorkspaceButton,
} from "../../plasmic/plasmic_kit_dashboard/PlasmicNavWorkspaceButton";
import { PublicLink } from "../PublicLink";

interface NavWorkspaceButtonProps extends DefaultNavWorkspaceButtonProps {}

function NavWorkspaceButton_(
  props: NavWorkspaceButtonProps,
  ref: HTMLElementRefOf<"a">
) {
  return (
    <PlasmicNavWorkspaceButton root={{ as: PublicLink, ref }} {...props} />
  );
}

const NavWorkspaceButton = React.forwardRef(NavWorkspaceButton_);
export default NavWorkspaceButton;
