import { Menu } from "antd";
import L from "lodash";
import { observer } from "mobx-react-lite";
import React from "react";
import { ArenaFrame } from "../../../classes";
import { ensure, parsePx } from "../../../common";
import { isTokenRef } from "../../../commons/StyleToken";
import {
  isFrameComponent,
  isPageComponent,
  isPageFrame,
  isPlainComponent,
} from "../../../components";
import { FrameViewMode, getFrameHeight } from "../../../shared/Arenas";
import { isStretchyComponentFrame } from "../../../shared/component-arenas";
import { FRAME_CAP } from "../../../shared/Labels";
import { ContainerLayoutType } from "../../../shared/layoututils";
import { frameSizeGroups } from "../../../shared/responsiveness";
import { getComponentDefaultSize } from "../../../shared/sizingutils";
import { Chroma } from "../../../shared/utils/color-utils";
import { getFrameContainerType } from "../../../sites";
import CenterAndPadIcon from "../../plasmic/plasmic_kit/PlasmicIcon__CenterAndPad";
import FrameStretchIcon from "../../plasmic/plasmic_kit/PlasmicIcon__FrameStretch";
import TriangleBottomIcon from "../../plasmic/plasmic_kit/PlasmicIcon__TriangleBottom";
import { ViewComponentProps, ViewCtx } from "../../studio-ctx/view-ctx";
import { makeFrameSizeMenu } from "../menus/FrameSizeMenu";
import { LabeledItemRow } from "../sidebar/sidebar-helpers";
import { SidebarModalProvider } from "../sidebar/SidebarModal";
import { ColorButton } from "../style-controls/ColorButton";
import StyleToggleButton from "../style-controls/StyleToggleButton";
import StyleToggleButtonGroup from "../style-controls/StyleToggleButtonGroup";
import * as widgets from "../widgets";
import { DimTokenSpinner } from "../widgets/DimTokenSelector";
import { Icon } from "../widgets/Icon";

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
      <FrameSizeSection frame={frame} viewCtx={viewCtx} />
      {!isPageComponent(component) && (
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
                  Content fills entire {FRAME_CAP}; useful for full-screen
                  designs.{" "}
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
                  Content centered in {FRAME_CAP}; useful for reusable
                  components like buttons.
                </>
              }
            >
              <Icon icon={CenterAndPadIcon} />
            </StyleToggleButton>
          </StyleToggleButtonGroup>
        </LabeledItemRow>
      )}
      {
        // We don't show the background color config if it is a page component;
        // in this case, the root node should be supplying the background color
        (isPlainComponent(component) || isFrameComponent(component)) && (
          <FrameBgSection viewCtx={viewCtx} />
        )
      }
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

  const containerType = getFrameContainerType(frame);

  const renderLabeledDimSpinner = (prop: "width" | "height", label: string) => {
    return (
      <LabeledItemRow label={label}>
        <DimTokenSpinner
          allowedUnits={["px"]}
          value={`${prop === "width" ? frame[prop] : getFrameHeight(frame)}px`}
          noClear
          disabled={
            (isPageFrame(frame) ||
              (isStretchyComponentFrame(frame) &&
                containerType !== ContainerLayoutType.free)) &&
            prop === "height"
          }
          onChange={(val) =>
            changeSize(prop, ensure(val, "onChange only fires for valid val"))
          }
          extraOptions={[]}
          data-test-id={`artboard-size-${prop}`}
          tooltip={
            isStretchyComponentFrame(frame) &&
            prop === "height" &&
            containerType !== ContainerLayoutType.free
              ? `In ${frame.viewMode} view mode the height is auto-sized`
              : undefined
          }
        />
      </LabeledItemRow>
    );
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

                    if (isPageFrame(frame)) {
                      frame.viewportHeight = size.height;
                    } else {
                      viewCtx.studioCtx.changeFrameSize({
                        frame,
                        dim: "height",
                        amount: size.height,
                      });
                    }

                    viewCtx.studioCtx.spreadNewFrameSize(frame);
                  }),
              })
            }
          >
            <button className="right-panel-input-background select-dropdown__button flex-fill code">
              <div className="select-dropdown__container">
                <span className="select-dropdown__selected">
                  {(() => {
                    const curSize = L.flatten(
                      frameSizeGroups.map((g) => g.sizes)
                    ).find(
                      (size) =>
                        size.width === frame.width &&
                        size.height === getFrameHeight(frame)
                    );
                    if (!curSize) {
                      return "";
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
      {renderLabeledDimSpinner("width", "Width")}
      {renderLabeledDimSpinner("height", "Height")}
    </>
  );
});
