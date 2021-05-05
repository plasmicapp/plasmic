import { MenuButtonRef } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultMenuButtonProps,
  PlasmicMenuButton,
} from "../plasmic/plume_main/PlasmicMenuButton";

interface MenuButtonProps extends DefaultMenuButtonProps {}

function MenuButton_(props: MenuButtonProps, ref: MenuButtonRef) {
  const { plasmicProps, state } = PlasmicMenuButton.useBehavior(props, ref);
  return <PlasmicMenuButton {...plasmicProps} />;
}

const MenuButton = React.forwardRef(MenuButton_);

export default Object.assign(MenuButton, {
  __plumeType: "menu-button",
});
