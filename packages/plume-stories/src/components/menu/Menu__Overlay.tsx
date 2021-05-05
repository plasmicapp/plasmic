import { TriggeredOverlayRef } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultMenu__OverlayProps,
  PlasmicMenu__Overlay,
} from "../plasmic/plume_main/PlasmicMenu__Overlay";

interface Menu__OverlayProps extends DefaultMenu__OverlayProps {}

function Menu__Overlay_(props: Menu__OverlayProps, ref: TriggeredOverlayRef) {
  const { plasmicProps } = PlasmicMenu__Overlay.useBehavior(props, ref);
  return <PlasmicMenu__Overlay {...plasmicProps} />;
}

const Menu__Overlay = React.forwardRef(Menu__Overlay_);

export default Object.assign(Menu__Overlay, {
  __plumeType: "triggered-overlay",
});
