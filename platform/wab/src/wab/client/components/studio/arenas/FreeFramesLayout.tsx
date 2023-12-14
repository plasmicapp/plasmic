import { ArenaFrame } from "@/wab/classes";
import { CanvasCtx } from "@/wab/client/components/canvas/canvas-ctx";
import { CanvasFrame } from "@/wab/client/components/canvas/CanvasFrame";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { AnyArena, PositionedArenaFrame } from "@/wab/shared/Arenas";
import L from "lodash";
import { observer } from "mobx-react-lite";
import React from "react";

export const FreeFramesLayout = observer(function FreeFramesLayout(props: {
  studioCtx: StudioCtx;
  frames: PositionedArenaFrame[];
  arena: AnyArena;
  onFrameLoad: (frame: ArenaFrame, canvasCtx: CanvasCtx) => void;
}) {
  const { frames, studioCtx, onFrameLoad, arena } = props;

  // We sort arenaFrames here by their uid as we render, so that
  // if they get re-ordered, we don't re-render a CanvasFrame.  The frame
  // themselves are absolutely-positioned anyway, so the render order
  // doesn't matter.
  return (
    <>
      {L.sortBy([...frames], (f) => f.uid).map((frame) => {
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
    </>
  );
});
