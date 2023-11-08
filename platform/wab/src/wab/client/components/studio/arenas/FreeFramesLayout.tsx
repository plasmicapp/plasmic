import L from "lodash";
import { observer } from "mobx-react-lite";
import React from "react";
import { ArenaFrame } from "../../../../classes";
import { AnyArena } from "../../../../shared/Arenas";
import { StudioCtx } from "../../../studio-ctx/StudioCtx";
import { CanvasCtx } from "../../canvas/canvas-ctx";
import { CanvasFrame } from "../../canvas/CanvasFrame";

export const FreeFramesLayout = observer(function FreeFramesLayout(props: {
  studioCtx: StudioCtx;
  frames: ArenaFrame[];
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
      {L.sortBy([...frames], (f) => f.uid).map((frame, i) => {
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
