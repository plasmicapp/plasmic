import cn from "classnames";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { ArenaFrame } from "../../../../classes";
import { FrameViewMode } from "../../../../shared/Arenas";
import {
  gridSpacing,
  hoverBoxTagHeight,
} from "../../../../styles/css-variables";
import { useScaledElementRef } from "../../../hooks/useScaledElementRef";
import PlasmicIcon__Frame from "../../../plasmic/plasmic_kit/PlasmicIcon__Frame";
import { useStudioCtx } from "../../../studio-ctx/StudioCtx";
import { maybeShowContextMenu } from "../../ContextMenu";
import { makeFrameMenu } from "../../frame-menu";
import { getGlobalCssVariableValue } from "../../studio/GlobalCssVariables";
import { Icon } from "../../widgets/Icon";
import styles from "./CanvasFrame.module.scss";

export const CanvasArtboardSelectionHandle = observer(
  function CanvasArtboardSelectionHandle_({
    frame,
    onClick,
  }: {
    frame: ArenaFrame;
    onClick: () => void;
  }) {
    const studioCtx = useStudioCtx();
    const hoverBoxObj = studioCtx.hoverBoxControlledObj;
    const isFocused = hoverBoxObj === frame;
    const isProminent =
      !isFocused && studioCtx.focusedViewCtx()?.arenaFrame() === frame;
    const _gridSpacing = parseInt(getGlobalCssVariableValue(gridSpacing));
    const _hoverBoxTagHeight = parseInt(
      getGlobalCssVariableValue(hoverBoxTagHeight)
    );

    const minZoom = isFocused ? 0 : _hoverBoxTagHeight / _gridSpacing;

    const rootRef = useScaledElementRef<HTMLDivElement>({
      minZoom: minZoom,
    });

    const handleContextMenu = (e) => {
      onClick();

      const viewCtx = studioCtx.focusedViewCtx();

      if (viewCtx) {
        const menu = makeFrameMenu({ viewCtx, frame });
        maybeShowContextMenu(e.nativeEvent, menu);
      }
    };

    return (
      <div
        ref={rootRef}
        className={cn(styles.artboardSelectionHandle, {
          [styles.artboardSelectionHandle_prominent]: isProminent,
          [styles.artboardSelectionHandle_focused]: isFocused,
        })}
        onContextMenu={handleContextMenu}
        onClick={onClick}
      >
        <Icon icon={PlasmicIcon__Frame} />
      </div>
    );
  }
);
