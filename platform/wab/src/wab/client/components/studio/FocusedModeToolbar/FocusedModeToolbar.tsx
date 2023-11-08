import { observer } from "mobx-react-lite";
import React from "react";
import { DEVFLAGS } from "../../../../devflags";
import RefreshsvgIcon from "../../../plasmic/q_4_icons/icons/PlasmicIcon__Refreshsvg";
import { StudioCtx } from "../../../studio-ctx/StudioCtx";
import { CanvasConfigButton } from "../../canvas/CanvasFrame/CanvasConfigButton";
import { VariantsBar } from "../../canvas/VariantsBar";
import { Icon } from "../../widgets/Icon";
import IconButton from "../../widgets/IconButton";
import Switch from "../../widgets/Switch";
import S from "./FocusedModeToolbar.module.scss";

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
