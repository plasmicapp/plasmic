import { ArenaFrame } from "@/wab/classes";
import { ComponentArenaLayout } from "@/wab/client/components/studio/arenas/ComponentArenaLayout";
import { FocusModeLayout } from "@/wab/client/components/studio/arenas/FocusModeLayout";
import { FreeFramesLayout } from "@/wab/client/components/studio/arenas/FreeFramesLayout";
import { PageArenaLayout } from "@/wab/client/components/studio/arenas/PageArenaLayout";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { unexpected } from "@/wab/common";
import {
  AnyArena,
  getPositionedArenaFrames,
  isComponentArena,
  isFocusedDedicatedArena,
  isMixedArena,
  isPageArena,
} from "@/wab/shared/Arenas";
import { observer } from "mobx-react-lite";
import React from "react";
import { CanvasCtx } from "./canvas-ctx";

export const CanvasArenaShell = observer(function CanvasArenaShell(props: {
  studioCtx: StudioCtx;
  arena: AnyArena;
  onFrameLoad: (frame: ArenaFrame, canvasCtx: CanvasCtx) => void;
}) {
  const { studioCtx, arena, onFrameLoad } = props;
  const visible = studioCtx.isArenaVisible(arena) && studioCtx.isDevMode;
  const isAlive = studioCtx.isArenaAlive(arena);

  return (
    <div
      data-arena-uid={arena.uid}
      className={visible ? "canvas-editor__frames" : undefined}
      style={
        !visible
          ? {
              display: "none",
              visibility: "hidden",
              pointerEvents: "none",
              position: "absolute",
              transform: "scale(0)",
            }
          : undefined
      }
    >
      {isAlive && (
        <CanvasArena
          studioCtx={studioCtx}
          arena={arena}
          onFrameLoad={onFrameLoad}
        />
      )}
    </div>
  );
});

export const CanvasArena = observer(function CanvasArena(props: {
  studioCtx: StudioCtx;
  arena: AnyArena;
  onFrameLoad: (frame: ArenaFrame, canvasCtx: CanvasCtx) => void;
}) {
  const { studioCtx, arena, onFrameLoad } = props;
  if (isMixedArena(arena)) {
    return (
      <FreeFramesLayout
        arena={arena}
        studioCtx={studioCtx}
        frames={getPositionedArenaFrames(arena)}
        onFrameLoad={onFrameLoad}
      />
    );
  } else if (isFocusedDedicatedArena(arena)) {
    return (
      <FocusModeLayout
        arena={arena}
        studioCtx={studioCtx}
        onFrameLoad={onFrameLoad}
      />
    );
  } else if (isPageArena(arena)) {
    return (
      <PageArenaLayout
        studioCtx={studioCtx}
        arena={arena}
        onFrameLoad={onFrameLoad}
      />
    );
  } else if (isComponentArena(arena)) {
    return (
      <ComponentArenaLayout
        studioCtx={studioCtx}
        arena={arena}
        onFrameLoad={onFrameLoad}
      />
    );
  } else {
    unexpected();
  }
});
