import {
  DefaultSelect__OverlayProps,
  PlasmicSelect__Overlay,
} from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicSelect__Overlay";
import { TriggeredOverlayRef } from "@plasmicapp/react-web";
import * as React from "react";

type Select__OverlayProps = DefaultSelect__OverlayProps;

function Select__Overlay_(
  props: Select__OverlayProps,
  ref: TriggeredOverlayRef
) {
  const { plasmicProps } = PlasmicSelect__Overlay.useBehavior(props, ref);
  return (
    <PlasmicSelect__Overlay
      root={{ "data-plasmic-role": "overlay" } as any}
      {...plasmicProps}
    />
  );
}

const Select__Overlay = React.forwardRef(Select__Overlay_);

export default Object.assign(Select__Overlay, {
  __plumeType: "triggered-overlay",
});
