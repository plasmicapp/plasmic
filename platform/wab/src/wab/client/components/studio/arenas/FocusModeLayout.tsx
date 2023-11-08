import { observer } from "mobx-react-lite";
import React from "react";
import { ArenaFrame, ComponentArena, PageArena } from "../../../../classes";
import { assert } from "../../../../common";
import { StudioCtx } from "../../../studio-ctx/StudioCtx";
import { CanvasCtx } from "../../canvas/canvas-ctx";
import { CanvasFrame } from "../../canvas/CanvasFrame";

export const FocusModeLayout = observer(function FocusModeLayout(props: {
  studioCtx: StudioCtx;
  arena: ComponentArena | PageArena;
  onFrameLoad: (frame: ArenaFrame, canvasCtx: CanvasCtx) => void;
}) {
  const { studioCtx, onFrameLoad, arena } = props;

  assert(
    arena._focusedFrame,
    "FocusModeLayout cannot be used with arenas with no _focusedFrame"
  );

  return (
    <CanvasFrame
      studioCtx={studioCtx}
      arena={arena}
      key={arena._focusedFrame.uid}
      onFrameLoad={onFrameLoad}
      arenaFrame={arena._focusedFrame}
      isFree={false}
    />
  );
});
