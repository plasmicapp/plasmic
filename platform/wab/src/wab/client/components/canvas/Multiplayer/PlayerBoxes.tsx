import { observer } from "mobx-react-lite";
import * as React from "react";
import { maybe } from "../../../../common";
import { $ } from "../../../../deps";
import { hasLayoutBox } from "../../../../dom";
import { getArenaFrames } from "../../../../shared/Arenas";
import { frameToScalerRect } from "../../../coords";
import {
  cssPropsForInvertTransform,
  StudioCtx,
  useStudioCtx,
} from "../../../studio-ctx/StudioCtx";
import { useForceUpdate } from "../../../useForceUpdate";
import { recomputeBounds } from "../HoverBox/recomputeBounds";

export const PlayerBoxes = observer(function PlayerBoxes() {
  const studioCtx = useStudioCtx();
  return (
    <>
      {!studioCtx.editMode || !studioCtx.showMultiplayerSelections()
        ? null
        : studioCtx.multiplayerCtx
            .getAllPlayerIds()
            .map((playerId) => (
              <PlayerBox
                studioCtx={studioCtx}
                key={playerId}
                playerId={playerId}
              />
            ))}
    </>
  );
});

interface PlayerBoxProps {
  studioCtx: StudioCtx;
  playerId: number;
}

const PlayerBox = observer(function PlayerBox({
  studioCtx,
  playerId,
}: PlayerBoxProps) {
  const maybeData = (() => {
    const multiplayerCtx = studioCtx.multiplayerCtx;
    const playerData = multiplayerCtx.getPlayerDataById(playerId);
    if (
      !multiplayerCtx.knowsSelf() ||
      !playerData ||
      !playerData.viewInfo?.selectionInfo?.selectableFrameUuid
    ) {
      return null;
    }
    const branch = studioCtx.branchInfo();
    if (playerData.viewInfo?.branchId !== branch?.id) {
      return null;
    }
    const viewCtx = tryGetViewCtxFromFrameUuid(
      studioCtx,
      playerData.viewInfo.selectionInfo.selectableFrameUuid
    );
    if (!viewCtx) {
      return null;
    }
    const selectable = viewCtx.getSelectableFromSelectionId(
      playerData.viewInfo.selectionInfo.selectableKey
    );
    if (!selectable) {
      return null;
    }
    return {
      $elt: maybe(
        viewCtx.renderState.sel2dom(selectable, viewCtx.canvasCtx),
        (dom) => $(dom)
      ),
      viewCtx,
      playerData,
    };
  })();

  const $elt = maybeData?.$elt;

  const forceUpdate = useForceUpdate();

  React.useEffect(() => {
    if ($elt && $elt.length > 0) {
      const resizeObserver = new ResizeObserver(forceUpdate);
      const elts = $elt.toArray();
      elts.forEach((elt) => resizeObserver.observe(elt));
      return () => {
        resizeObserver.disconnect();
      };
    } else {
      return undefined;
    }
  }, [$elt]);

  if (!maybeData || !$elt || $elt.toArray().filter(hasLayoutBox).length === 0) {
    return null;
  }

  const { viewCtx, playerData } = maybeData;

  const eltRect = recomputeBounds($elt).rect();
  const scalerRect = frameToScalerRect(eltRect, viewCtx);
  const cssProps = cssPropsForInvertTransform(studioCtx.zoom, scalerRect);

  return (
    <div
      className={"PlayerBox"}
      data-original-width={scalerRect ? scalerRect.width : undefined}
      data-original-height={scalerRect ? scalerRect.height : undefined}
      style={{
        display: "block",
        ...(scalerRect ? scalerRect : {}),
        ...cssProps,
        borderColor: playerData.color,
      }}
    />
  );
});

export function tryGetViewCtxFromFrameUuid(
  studioCtx: StudioCtx,
  selectableFrameUuid: string
) {
  return studioCtx.tryGetViewCtxForFrame(
    getArenaFrames(studioCtx.currentArena).find(
      (frame) => frame.uuid === selectableFrameUuid
    )
  );
}
