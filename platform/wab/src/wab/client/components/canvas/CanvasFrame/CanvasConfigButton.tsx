import { Popover } from "antd";
import cn from "classnames";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { ArenaFrame } from "../../../../classes";
import { getFrameHeight } from "../../../../shared/Arenas";
import {
  gridSpacing,
  hoverBoxTagHeight,
} from "../../../../styles/css-variables";
import { useScaledElementRef } from "../../../hooks/useScaledElementRef";
import GearIcon from "../../../plasmic/plasmic_kit/PlasmicIcon__Gear";
import { StudioCtx } from "../../../studio-ctx/StudioCtx";
import { FramePanel } from "../../sidebar-tabs/frame-tab";
import { getGlobalCssVariableValue } from "../../studio/GlobalCssVariables";
import { useOnIFrameMouseDown } from "../../widgets";

export const CanvasConfigButton = observer(function CanvasConfigButton_(props: {
  studioCtx: StudioCtx;
  frame: ArenaFrame;
  contained?: boolean;
  showDims?: boolean;
}) {
  const { studioCtx, frame, showDims } = props;
  const vc = studioCtx.tryGetViewCtxForFrame(frame);
  const isFocused = studioCtx.focusedContentFrame() === frame;
  const [visible, setVisible] = React.useState(false);
  const _gridSpacing = parseInt(getGlobalCssVariableValue(gridSpacing), 10);
  const _hoverBoxTagHeight = parseInt(
    getGlobalCssVariableValue(hoverBoxTagHeight),
    10
  );
  const minZoom = Math.max(studioCtx.zoom, _hoverBoxTagHeight / _gridSpacing);

  const buttonRef = useScaledElementRef<HTMLButtonElement>({
    minZoom,
    extraTransformation: props.contained ? "" : "rotate(90deg)",
    disableScaling: props.contained,
  });

  const onIFrameClick = React.useCallback(() => {
    setVisible(false);
  }, [setVisible]);

  useOnIFrameMouseDown(onIFrameClick);

  return (
    <Popover
      content={vc && <FramePanel viewCtx={vc} frame={frame} />}
      trigger={["click"]}
      onVisibleChange={(v) => setVisible(v)}
      visible={visible}
      placement={props.contained ? "bottomLeft" : "right"}
    >
      <button
        ref={buttonRef}
        className={cn({
          flex: true,
          "flex-vcenter": true,
          CanvasFrame__Config: true,
          CanvasFrame__Config_contained: props.contained,
        })}
        data-test-id={isFocused && "artboard-config-button"}
        onPointerDown={async (e) => {
          if (studioCtx.isSpaceDown()) {
            // panning clicking.
            return;
          }
          e.stopPropagation();
          await studioCtx.changeUnsafe(() =>
            studioCtx.setStudioFocusOnFrame({ frame: frame, autoZoom: false })
          );
        }}
      >
        <GearIcon className="CanvasFrame__Config__icon" />
        {showDims && (
          <>
            {frame.width}{" "}
            <span style={{ margin: "0 5px", fontSize: ".7em" }}>✕</span>{" "}
            {getFrameHeight(frame)}
          </>
        )}
      </button>
    </Popover>
  );
});
