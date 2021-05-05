import * as React from "react";
import {
  DefaultMenu__GroupProps,
  PlasmicMenu__Group,
} from "../plasmic/plume_main/PlasmicMenu__Group";

interface Menu__GroupProps extends DefaultMenu__GroupProps {}

function Menu__Group(props: Menu__GroupProps) {
  const { plasmicProps } = PlasmicMenu__Group.useBehavior(props);
  return <PlasmicMenu__Group {...plasmicProps} />;
}

export default Object.assign(Menu__Group, {
  __plumeType: "menu-group",
});
