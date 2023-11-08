import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultNavButtonProps,
  PlasmicNavButton,
} from "../../plasmic/plasmic_kit_dashboard/PlasmicNavButton";
import { PublicLink } from "../PublicLink";

interface NavButtonProps extends DefaultNavButtonProps {
  onClick?: () => void;
}

function NavButton_(props: NavButtonProps, ref: HTMLElementRefOf<"a">) {
  return (
    <PlasmicNavButton
      root={{
        as: !props.href
          ? "button"
          : props.href.startsWith("/")
          ? PublicLink
          : undefined,
        ref,
      }}
      {...props}
    />
  );
}

const NavButton = React.forwardRef(NavButton_);
export default NavButton;
