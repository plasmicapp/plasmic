import { ArenaFrame } from "@/wab/classes";
import { ComponentArenaLayout } from "@/wab/client/components/studio/arenas/ComponentArenaLayout";
import { FocusModeLayout } from "@/wab/client/components/studio/arenas/FocusModeLayout";
import { FreeFramesLayout } from "@/wab/client/components/studio/arenas/FreeFramesLayout";
import { PageArenaLayout } from "@/wab/client/components/studio/arenas/PageArenaLayout";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { cx, unexpected } from "@/wab/common";
import {
  AnyArena,
  isComponentArena,
  isFocusedDedicatedArena,
  isMixedArena,
  isPageArena,
} from "@/wab/shared/Arenas";
import { observer } from "mobx-react";
import React from "react";
import { CanvasCtx } from "./canvas-ctx";

export const CanvasArenaShell = observer(function CanvasArenaShell(props: {
  studioCtx: StudioCtx;
  arena: AnyArena;
  onFrameLoad: (frame: ArenaFrame, canvasCtx: CanvasCtx) => void;
}) {
  const { studioCtx, arena, onFrameLoad } = props;
  const isDevMode = studioCtx.isDevMode;
  const isVisible = studioCtx.isArenaVisible(arena);
  const isAlive = studioCtx.isArenaAlive(arena);

  return (
    <div
      data-arena-uid={arena.uid}
      className={cx(
        isVisible ? "canvas-editor__frames" : "display-none",
        isDevMode ? undefined : "invisible"
      )}
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
