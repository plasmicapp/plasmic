import { makeFrameSizeMenu } from "@/wab/client/components/menus/FrameSizeMenu";
import { SidebarModalProvider } from "@/wab/client/components/sidebar/SidebarModal";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { ColorButton } from "@/wab/client/components/style-controls/ColorButton";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import StyleToggleButtonGroup from "@/wab/client/components/style-controls/StyleToggleButtonGroup";
import * as widgets from "@/wab/client/components/widgets";
import { DimTokenSpinner } from "@/wab/client/components/widgets/DimTokenSelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import CenterAndPadIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__CenterAndPad";
import FrameStretchIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__FrameStretch";
import TriangleBottomIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TriangleBottom";
import { ViewComponentProps, ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { isTokenRef } from "@/wab/commons/StyleToken";
import {
  FrameViewMode,
  getFrameHeight,
  isHeightAutoDerived,
} from "@/wab/shared/Arenas";
import { FRAME_CAP } from "@/wab/shared/Labels";
import { ensure, parsePx } from "@/wab/shared/common";
import { isPageComponent, isPageFrame } from "@/wab/shared/core/components";
import { ArenaFrame } from "@/wab/shared/model/classes";
import { frameSizeGroups } from "@/wab/shared/responsiveness";
import { getComponentDefaultSize } from "@/wab/shared/sizingutils";
import { Chroma } from "@/wab/shared/utils/color-utils";
import { Menu } from "antd";
import L from "lodash";
import { observer } from "mobx-react";
import React from "react";

interface FramePanelProps extends ViewComponentProps {
  frame: ArenaFrame;
}

export const FramePanel = observer(function FramePanel(props: FramePanelProps) {
  const { viewCtx, frame } = props;

  const component = frame.container.component;

  const defaultSize = getComponentDefaultSize(
    component,
    viewCtx.variantTplMgr().getRootVariantCombo()
  );
  const isStretchable = defaultSize.width === "stretch";
  return (
    <div style={{ width: 200 }}>
      {
        // We don't show the background color config if it is a page component;
        // in this case, the root node should be supplying the background color
        !isPageComponent(component) && (
          <>
            <FrameBgSection viewCtx={viewCtx} />
            <LabeledItemRow label="View mode">
              <StyleToggleButtonGroup
                value={frame.viewMode}
                onChange={async (mode) =>
                  viewCtx.studioCtx.changeFrameViewMode(
                    frame,
                    mode as "stretch" | "centered"
                  )
                }
                autoWidth
              >
                <StyleToggleButton
                  value={FrameViewMode.Stretch}
                  tooltip={
                    <>
                      Stretch mode, where content fills entire {FRAME_CAP}.
                      Useful for full-screen designs.{" "}
                      {!isStretchable && (
                        <strong>
                          Will also set your root width to <code>stretch</code>!
                        </strong>
                      )}
                    </>
                  }
                >
                  <Icon icon={FrameStretchIcon} />
                </StyleToggleButton>
                <StyleToggleButton
                  value={FrameViewMode.Centered}
                  tooltip={
                    <>
                      Centered mode, where content is centered in {FRAME_CAP}.
                      Useful for reusable components like buttons.
                    </>
                  }
                >
                  <Icon icon={CenterAndPadIcon} />
                </StyleToggleButton>
              </StyleToggleButtonGroup>
            </LabeledItemRow>
          </>
        )
      }
      <FrameSizeSection frame={frame} viewCtx={viewCtx} />
    </div>
  );
});

const FrameBgSection = observer(function FrameBgSection(props: {
  viewCtx: ViewCtx;
}) {
  const { viewCtx } = props;
  const frame = viewCtx.arenaFrame();

  const handleChange = (color?: string) => {
    viewCtx.change(() => {
      if (
        color &&
        (/transparent/i.test(color) ||
          (!isTokenRef(color) && Chroma(color).alpha() === 0))
      ) {
        // User set to a transparent color
        color = undefined;
      }
      frame.bgColor = color;
    });
  };

  return (
    <SidebarModalProvider>
      <LabeledItemRow
        label="Background"
        menu={() => (
          <Menu>
            <Menu.Item onClick={() => handleChange(undefined)}>
              Clear background color
            </Menu.Item>
          </Menu>
        )}
        definedIndicator={
          frame.bgColor
            ? {
                source: "setNonVariable",
                prop: "background-color",
                value: frame.bgColor,
              }
            : undefined
        }
      >
        <ColorButton
          color={frame.bgColor || ""}
          onChange={(color) => handleChange(color)}
          sc={viewCtx.studioCtx}
          popupTitle="Artboard background"
        />
      </LabeledItemRow>
    </SidebarModalProvider>
  );
});

const FrameSizeSection = observer(function FrameSizeSection(
  props: FramePanelProps
) {
  const { frame, viewCtx } = props;

  const changeSize = (prop: "width" | "height", val: string) => {
    viewCtx.change(() => {
      const parsedValue = parsePx(val);
      viewCtx.studioCtx.changeFrameSize({
        dim: prop,
        frame,
        amount: parsedValue,
      });
      viewCtx.studioCtx.spreadNewFrameSize(frame);
    });
  };

  return (
    <>
      {frame.viewMode === FrameViewMode.Stretch && (
        <LabeledItemRow label="Device">
          <widgets.IFrameAwareDropdownMenu
            menu={() =>
              makeFrameSizeMenu({
                studioCtx: viewCtx.studioCtx,
                onClick: (size) =>
                  viewCtx.change(() => {
                    viewCtx.studioCtx.changeFrameSize({
                      frame,
                      dim: "width",
                      amount: size.width,
                    });
                    viewCtx.studioCtx.changeFrameSize({
                      frame,
                      dim: "height",
                      amount: size.height,
                    });

                    viewCtx.studioCtx.spreadNewFrameSize(frame);
                  }),
              })
            }
          >
            <button className="right-panel-input-background select-dropdown__button flex-fill">
              <div className="select-dropdown__container">
                <span
                  className="select-dropdown__selected"
                  style={{ padding: "6px 8px" }}
                >
                  {(() => {
                    const curSize = L.flatten(
                      frameSizeGroups.map((g) => g.sizes)
                    ).find(
                      (size) =>
                        size.width === frame.width &&
                        size.height === frame.height
                    );
                    if (!curSize) {
                      return "Custom";
                    } else {
                      return curSize.name;
                    }
                  })()}
                </span>
                <Icon icon={TriangleBottomIcon} className="dimfg" />
              </div>
            </button>
          </widgets.IFrameAwareDropdownMenu>
        </LabeledItemRow>
      )}
      <LabeledItemRow label={"Width"}>
        <DimTokenSpinner
          data-test-id="artboard-size-width"
          allowedUnits={["px"]}
          value={`${frame.width}px`}
          noClear
          onChange={(val) => changeSize("width", ensure(val, "noClear"))}
          allowFunctions={false}
        />
      </LabeledItemRow>
      <LabeledItemRow label={"Height"}>
        <DimTokenSpinner
          data-test-id="artboard-size-height"
          allowedUnits={["px"]}
          value={`${frame.height}px`}
          noClear
          onChange={(val) => changeSize("height", ensure(val, "noClear"))}
          allowFunctions={false}
        />
      </LabeledItemRow>
      {isHeightAutoDerived(frame) && (
        <LabeledItemRow label={"Content Height"}>
          <DimTokenSpinner
            data-test-id="artboard-size-content-height"
            allowedUnits={["px"]}
            value={`${getFrameHeight(frame)}px`}
            noClear
            onChange={() => {
              /* this should never be invoked */
            }}
            disabled
            tooltipPlacement={"bottom"}
            tooltip={
              isPageFrame(frame)
                ? "Page height grows based on content. This value is automatically computed."
                : "In stretch mode, component height grows based on content. This value is automatically computed."
            }
            allowFunctions={false}
          />
        </LabeledItemRow>
      )}
    </>
  );
});
