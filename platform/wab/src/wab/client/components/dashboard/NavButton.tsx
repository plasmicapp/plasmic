import { PublicLink } from "@/wab/client/components/PublicLink";
import {
  DefaultNavButtonProps,
  PlasmicNavButton,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicNavButton";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

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
