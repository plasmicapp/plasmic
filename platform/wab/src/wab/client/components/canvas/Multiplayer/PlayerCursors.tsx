import { scalerToClientPt } from "@/wab/client/coords";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure } from "@/wab/common";
import { Pt } from "@/wab/geom";
import { getArenaType, getArenaUuidOrName } from "@/wab/shared/Arenas";
import $ from "jquery";
import { observer } from "mobx-react-lite";
import { PerfectCursor } from "perfect-cursors";
import * as React from "react";
import MultiplayerCursor from "./MultiplayerCursor";

export const PlayerCursors = observer(function PlayerCursors() {
  const studioCtx = useStudioCtx();
  if (
    !studioCtx.editMode ||
    studioCtx.isLiveMode ||
    !studioCtx.showMultiplayerSelections()
  ) {
    return null;
  }
  return (
    <>
      {studioCtx.multiplayerCtx.getAllPlayerIds().map((playerId) => (
        <PlayerCursor
          studioCtx={studioCtx}
          key={playerId}
          playerId={playerId}
        />
      ))}
    </>
  );
});

interface PlayerCursorProps {
  studioCtx: StudioCtx;
  playerId: number;
}

const PlayerCursor = observer(function PlayerCursor({
  studioCtx,
  playerId,
}: PlayerCursorProps) {
  const multiplayerCtx = studioCtx.multiplayerCtx;
  const playerData = multiplayerCtx.getPlayerDataById(playerId);
  const color = playerData?.color;
  const viewInfo = playerData?.viewInfo;
  const cursorData = viewInfo?.cursorInfo;
  const activeArena = studioCtx.currentArena;
  if (!multiplayerCtx.knowsSelf() || !cursorData || !color || !activeArena) {
    return null;
  }

  const arenaType = getArenaType(activeArena);
  const arenaUuidOrName = getArenaUuidOrName(activeArena);
  const clipper = studioCtx.maybeCanvasClipper();
  const branch = studioCtx.branchInfo();

  if (
    viewInfo?.branchId !== branch?.id ||
    viewInfo?.arenaInfo?.type !== arenaType ||
    viewInfo?.arenaInfo.uuidOrName !== arenaUuidOrName ||
    !clipper
  ) {
    return null;
  }

  // TODO: https://app.shortcut.com/plasmic/story/37322
  if (studioCtx.focusedMode || viewInfo?.arenaInfo?.focused) {
    return null;
  }

  // Trigger rerender of PlayerCursors when the user moves or zooms in the canvas
  const _ = [studioCtx.getScalerTranslate(), studioCtx.zoom];
  const clipperOffset = ensure(
    $(clipper).offset(),
    "Offset should not be undefiend"
  );

  const pt = scalerToClientPt(
    new Pt(cursorData.left, cursorData.top),
    studioCtx
  ).moveBy(-clipperOffset.left, -clipperOffset.top);

  return (
    <AnimatedCursor
      point={pt}
      userName={playerData.user?.firstName ?? "Anon"}
      color={color}
    />
  );
});

const AnimatedCursor = observer(function AnimatedCursor(props: {
  point: Pt;
  userName?: string;
  color?: string;
}) {
  const { point, userName, color } = props;
  const rCursor = React.useRef<HTMLDivElement>(null);
  const animateCursor = React.useCallback((p: number[]) => {
    const elm = rCursor.current;
    if (!elm) return;
    elm.style.setProperty(
      "transform",
      `translate3d(${p[0]}px, ${p[1]}px, 0px)`
    );
  }, []);

  const onPointMove = usePerfectCursor(animateCursor);

  React.useLayoutEffect(
    () => onPointMove([point.x, point.y]),
    [onPointMove, point]
  );

  return (
    <MultiplayerCursor
      ref={rCursor}
      className="PlayerCursor"
      hexColor={color}
      name={userName}
    />
  );
});

function usePerfectCursor(cb: (point: number[]) => void, point?: number[]) {
  const [pc] = React.useState(() => new PerfectCursor(cb));

  React.useLayoutEffect(() => {
    if (point) pc.addPoint(point);
    return () => pc.dispose();
  }, [pc]);

  const onPointChange = React.useCallback(
    (p: number[]) => pc.addPoint(p),
    [pc]
  );

  return onPointChange;
}
