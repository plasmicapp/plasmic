import { observer } from "mobx-react-lite";
import React from "react";
import {
  ArenaFrame,
  isKnownArena,
  isKnownComponentArena,
  isKnownPageArena,
} from "../../../classes";
import { unexpected } from "../../../common";
import { AnyArena } from "../../../shared/Arenas";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { ComponentArenaLayout } from "../studio/arenas/ComponentArenaLayout";
import { FocusModeLayout } from "../studio/arenas/FocusModeLayout";
import { FreeFramesLayout } from "../studio/arenas/FreeFramesLayout";
import { PageArenaLayout } from "../studio/arenas/PageArenaLayout";
import { CanvasCtx } from "./canvas-ctx";

export const CanvasArenaShell = observer(function CanvasArenaShell(props: {
  studioCtx: StudioCtx;
  arena: AnyArena;
  onFrameLoad: (frame: ArenaFrame, canvasCtx: CanvasCtx) => void;
}) {
  const { studioCtx, arena, onFrameLoad } = props;
  const visible = studioCtx.isArenaVisible(arena);
  const isAlive = studioCtx.isArenaAlive(arena);

  return (
    <div
      className={visible ? "canvas-editor__frames" : undefined}
      style={
        !visible
          ? {
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
  if (isKnownArena(arena)) {
    return (
      <FreeFramesLayout
        arena={arena}
        studioCtx={studioCtx}
        frames={arena.children}
        onFrameLoad={onFrameLoad}
      />
    );
  } else if (arena._focusedFrame) {
    return (
      <FocusModeLayout
        arena={arena}
        studioCtx={studioCtx}
        onFrameLoad={onFrameLoad}
      />
    );
  } else if (isKnownPageArena(arena)) {
    return (
      <PageArenaLayout
        studioCtx={studioCtx}
        arena={arena}
        onFrameLoad={onFrameLoad}
      />
    );
  } else if (isKnownComponentArena(arena)) {
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
