import { FramePanel } from "@/wab/client/components/sidebar-tabs/frame-tab";
import { getGlobalCssVariableValue } from "@/wab/client/components/studio/GlobalCssVariables";
import { useOnIFrameMouseDown } from "@/wab/client/components/widgets";
import { useScaledElementRef } from "@/wab/client/hooks/useScaledElementRef";
import GearIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Gear";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getFrameHeight } from "@/wab/shared/Arenas";
import { ArenaFrame } from "@/wab/shared/model/classes";
import { gridSpacing, hoverBoxTagHeight } from "@/wab/styles/css-variables";
import { Popover } from "antd";
import cn from "classnames";
import { observer } from "mobx-react";
import * as React from "react";

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
