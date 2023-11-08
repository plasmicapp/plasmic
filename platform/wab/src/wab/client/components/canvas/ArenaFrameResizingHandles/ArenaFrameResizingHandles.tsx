import { observer } from "mobx-react-lite";
import * as React from "react";
import { useState } from "react";
import { ArenaFrame } from "../../../../classes";
import { useStudioCtx } from "../../../studio-ctx/StudioCtx";
import { ResizingHandle } from "../../ResizingHandle";

enum HandlePosition {
  bottom = "bottom",
  top = "top",
  left = "left",
  right = "right",
}

interface FrameRect {
  width: number;
  height: number;
  top: number;
  left: number;
}

/**
 * These frame resizing handles are only used in focused mode,
 * when only one frame is visible at a time and the hover box
 * is not visible
 */
export const ArenaFrameResizingHandles = observer(ArenaFrameResizingHandles_);

function ArenaFrameResizingHandles_({ frame }: { frame: ArenaFrame }) {
  const studioCtx = useStudioCtx();

  const [lastFrameRect, setLastArenaFrameRect] = useState<
    FrameRect | undefined
  >(undefined);

  const onDrag = ({ deltaY = 0, deltaX = 0 }) => {
    if (lastFrameRect) {
      studioCtx
        .focusedViewCtx()!
        .getViewOps()
        // Here we do just the cheap changes and
        // the expensive one is deferred to be done
        // when dragging ends
        .quicklyChangeFrameRect(frame, {
          // On focused mode, we resize width symmetrically,
          // that's why we have deltaX * 2
          width: Math.round(lastFrameRect!.width + deltaX * 2),
          height: Math.round(lastFrameRect!.height + deltaY),
          left: Math.round(lastFrameRect!.left - deltaX),
          top: lastFrameRect!.top,
        });
    }
  };

  const onStopDragging = () => {
    studioCtx.isResizingFocusedArenaFrame = false;
  };

  const onStartDragging = () => {
    studioCtx.isResizingFocusedArenaFrame = true;
    setLastArenaFrameRect(studioCtx.getArenaFrameScalerRect(frame));
  };

  return (
    <>
      {[HandlePosition.bottom, HandlePosition.left, HandlePosition.right].map(
        (it) => (
          <ResizingHandle
            key={it}
            zoom={studioCtx.zoom}
            onDrag={onDrag}
            onStartDragging={onStartDragging}
            onStopDragging={onStopDragging}
            position={it}
          />
        )
      )}
    </>
  );
}
