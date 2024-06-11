import { Icon } from "@/wab/client/components/widgets/Icon";
import DownloadsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Downloadsvg";
import { observer } from "mobx-react";
import * as React from "react";

interface CanvasDndOverlayProps {
  opts: {
    visible: boolean;
  };
}

function CanvasDndOverlay_(props: CanvasDndOverlayProps) {
  const visible = props.opts.visible;
  return (
    <div
      style={{
        zIndex: 99,
        position: "fixed",
        display: !visible ? "none" : "block",
        width: "100%",
        height: "100%",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        cursor: "pointer",
      }}
    >
      <Icon
        icon={DownloadsvgIcon}
        size={64}
        style={{
          zIndex: 100,
          position: "fixed",
          display: !visible ? "none" : "block",
          top: "50%",
          left: "50%",
          color: "#ffffff",
        }}
      />
      ;
    </div>
  );
}

export const CanvasDndOverlay = observer(CanvasDndOverlay_);
