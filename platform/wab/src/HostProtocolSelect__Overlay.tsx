import { TriggeredOverlayRef } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultHostProtocolSelect__OverlayProps,
  PlasmicHostProtocolSelect__Overlay,
} from "./wab/client/plasmic/plasmic_kit_dashboard/PlasmicHostProtocolSelect__Overlay";

interface HostProtocolSelect__OverlayProps
  extends DefaultHostProtocolSelect__OverlayProps {}

function HostProtocolSelect__Overlay_(
  props: HostProtocolSelect__OverlayProps,
  ref: TriggeredOverlayRef
) {
  const { plasmicProps } = PlasmicHostProtocolSelect__Overlay.useBehavior(
    props,
    ref
  );
  return <PlasmicHostProtocolSelect__Overlay {...plasmicProps} />;
}

const HostProtocolSelect__Overlay = React.forwardRef(
  HostProtocolSelect__Overlay_
);

export default Object.assign(HostProtocolSelect__Overlay, {
  __plumeType: "triggered-overlay",
});
