import { TriggeredOverlayRef } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultSelect__OverlayProps,
  PlasmicSelect__Overlay,
} from "../plasmic/plume_main/PlasmicSelect__Overlay";

interface Select__OverlayProps extends DefaultSelect__OverlayProps {}

function Select__Overlay_(
  props: Select__OverlayProps,
  ref: TriggeredOverlayRef
) {
  const { plasmicProps } = PlasmicSelect__Overlay.useBehavior(props, ref);
  return <PlasmicSelect__Overlay {...plasmicProps} />;
}

const Select__Overlay = React.forwardRef(Select__Overlay_);

export default Object.assign(Select__Overlay, {
  __plumeType: "triggered-overlay",
});
