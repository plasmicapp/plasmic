import { CanvasConfigButton } from "@/wab/client/components/canvas/CanvasFrame/CanvasConfigButton";
import { VariantsBar } from "@/wab/client/components/canvas/VariantsBar";
import S from "@/wab/client/components/studio/FocusedModeToolbar/FocusedModeToolbar.module.scss";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import Switch from "@/wab/client/components/widgets/Switch";
import RefreshsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Refreshsvg";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { observer } from "mobx-react";
import React from "react";

export const FocusedModeToolbar = observer(
  ({ studioCtx }: { studioCtx: StudioCtx }) => {
    const onChange = (val) =>
      studioCtx.change(({ success }) => {
        studioCtx.isInteractiveMode = val;
        return success();
      });

    const onClick = async () => {
      await studioCtx.change(({ success }) => {
        studioCtx.refreshFocusedFrameArena();
        return success();
      });
    };

    const currentArenaViewCtx = studioCtx.focusedViewCtx();
    const currentFrame = currentArenaViewCtx?.arenaFrame();

    return !studioCtx.focusedMode ? null : (
      <div className={S.root}>
        <div className={S.variantsBarContainer}>
          <VariantsBar contained />
        </div>
        <div className={"flex flex-vcenter"}>
          {DEVFLAGS.interactiveCanvas && (
            <div
              id="interactive-canvas-switch"
              className={S.interactiveCanvasSwitchContainer}
            >
              <label>
                <Switch
                  isChecked={studioCtx.isInteractiveMode}
                  onChange={onChange}
                  style={{ marginRight: 6 }}
                  data-test-id={"interactive-switch"}
                />
                Interactive
              </label>
              <IconButton
                tooltip="Refresh arena"
                id={"refresh-canvas-btn"}
                onClick={onClick}
              >
                <Icon icon={RefreshsvgIcon} />
              </IconButton>
            </div>
          )}
          {currentFrame && (
            <CanvasConfigButton
              contained
              studioCtx={studioCtx}
              frame={currentFrame}
            />
          )}
        </div>
      </div>
    );
  }
);
