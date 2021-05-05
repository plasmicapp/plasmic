import { TriggeredOverlayRef } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultOverlayProps,
  PlasmicOverlay,
} from "./plasmic/plume_main/PlasmicOverlay";

interface OverlayProps extends DefaultOverlayProps {}

function Overlay_(props: OverlayProps, ref: TriggeredOverlayRef) {
  const { plasmicProps } = PlasmicOverlay.useBehavior(props, ref);
  return <PlasmicOverlay {...plasmicProps} />;
}

const Overlay = React.forwardRef(Overlay_);

export default Object.assign(Overlay, {
  __plumeType: "triggered-overlay",
});
