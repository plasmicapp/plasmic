import * as React from "react";
import {
  DefaultMenu__ItemProps,
  PlasmicMenu__Item,
} from "../plasmic/plume_main/PlasmicMenu__Item";

interface Menu__ItemProps extends DefaultMenu__ItemProps {}

function Menu__Item(props: Menu__ItemProps) {
  const { plasmicProps } = PlasmicMenu__Item.useBehavior(props);
  return <PlasmicMenu__Item {...plasmicProps} />;
}

export default Object.assign(Menu__Item, {
  __plumeType: "menu-item",
});
