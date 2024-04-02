import { Arena, ArenaFrame } from "@/wab/classes";
import { CanvasCtx } from "@/wab/client/components/canvas/canvas-ctx";
import { CanvasFrame } from "@/wab/client/components/canvas/CanvasFrame";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getMixedArenaSize } from "@/wab/shared/Arenas";
import L from "lodash";
import { observer } from "mobx-react";
import React from "react";

export const FreeFramesLayout = observer(function FreeFramesLayout(props: {
  studioCtx: StudioCtx;
  arena: Arena;
  onFrameLoad: (frame: ArenaFrame, canvasCtx: CanvasCtx) => void;
}) {
  const { studioCtx, onFrameLoad, arena } = props;

  // This component is inserted into the scaler.
  // The scaler needs to know the size of its children to zoom properly.
  // Since mixed arenas have absolutely-positioned frames,
  // the DOM doesn't auto-compute the size.
  // Instead, we compute the size and set it on a container div.
  const arenaScalerSize = getMixedArenaSize(arena);

  // We sort arenaFrames here by their uid as we render, so that
  // if they get re-ordered, we don't re-render a CanvasFrame.  The frame
  // themselves are absolutely-positioned anyway, so the render order
  // doesn't matter.
  return (
    <div
      style={{
        width: `${arenaScalerSize.x}px`,
        height: `${arenaScalerSize.y}px`,
      }}
    >
      {L.sortBy(arena.children, (f) => f.uid).map((frame) => {
        return (
          <CanvasFrame
            studioCtx={studioCtx}
            arena={arena}
            key={frame.uid}
            onFrameLoad={onFrameLoad}
            arenaFrame={frame}
            isFree={true}
          />
        );
      })}
    </div>
  );
});
