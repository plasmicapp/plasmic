import { PublicLink } from "@/wab/client/components/PublicLink";
import {
  DefaultNavWorkspaceButtonProps,
  PlasmicNavWorkspaceButton,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicNavWorkspaceButton";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

type NavWorkspaceButtonProps = DefaultNavWorkspaceButtonProps;

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
