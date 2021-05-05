import { MenuRef } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultMenuProps,
  PlasmicMenu,
} from "../plasmic/plume_main/PlasmicMenu";
import Group from "./Menu__Group";
import Item from "./Menu__Item";

interface MenuProps extends DefaultMenuProps {}

function Menu_(props: MenuProps, ref: MenuRef) {
  const { plasmicProps } = PlasmicMenu.useBehavior(props, ref);
  return <PlasmicMenu {...plasmicProps} />;
}

const Menu = React.forwardRef(Menu_);

export default Object.assign(Menu, {
  Item,
  Group,
  __plumeType: "menu",
});
