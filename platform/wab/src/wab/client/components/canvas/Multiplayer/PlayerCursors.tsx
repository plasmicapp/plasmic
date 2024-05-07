import MultiplayerCursor from "@/wab/client/components/canvas/Multiplayer/MultiplayerCursor";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewportCtx } from "@/wab/client/studio-ctx/ViewportCtx";
import { Pt } from "@/wab/geom";
import { getArenaType, getArenaUuidOrName } from "@/wab/shared/Arenas";
import { observer } from "mobx-react";
import { PerfectCursor } from "perfect-cursors";
import * as React from "react";

export const PlayerCursors = observer(function PlayerCursors() {
  const studioCtx = useStudioCtx();
  const viewportCtx = studioCtx.viewportCtx;
  if (
    !viewportCtx ||
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
          viewportCtx={viewportCtx}
          key={playerId}
          playerId={playerId}
        />
      ))}
    </>
  );
});

interface PlayerCursorProps {
  studioCtx: StudioCtx;
  viewportCtx: ViewportCtx;
  playerId: number;
}

const PlayerCursor = observer(function PlayerCursor({
  studioCtx,
  viewportCtx,
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

  const pt = viewportCtx
    .scalerToClient(new Pt(cursorData.left, cursorData.top))
    .sub(viewportCtx.clipperBox().topLeft());

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
