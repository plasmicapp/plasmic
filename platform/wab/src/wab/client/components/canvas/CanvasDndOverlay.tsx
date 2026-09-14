import { Icon } from "@/wab/client/components/widgets/Icon";
import { useFileDragState } from "@/wab/client/file-drag/useFileDragState";
import UploadSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__UploadSvg";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import cx from "classnames";
import { observer } from "mobx-react";
import * as React from "react";

interface CanvasDndOverlayProps {
  /** The canvas container this overlay covers and reports drags over. */
  container: React.RefObject<HTMLElement>;
}

function CanvasDndOverlay_({ container }: CanvasDndOverlayProps) {
  const studioCtx = useStudioCtx();
  const dragState = useFileDragState(container.current);
  if (!dragState || studioCtx.isInteractiveMode) {
    return null;
  }
  return (
    <div
      className={cx("drop-overlay", "canvas-dnd-overlay", {
        "drop-overlay--dragover": dragState === "draggingOver",
      })}
    >
      <Icon icon={UploadSvgIcon} size={40} />
      <span>Drop image to upload</span>
    </div>
  );
}

export const CanvasDndOverlay = observer(CanvasDndOverlay_);
