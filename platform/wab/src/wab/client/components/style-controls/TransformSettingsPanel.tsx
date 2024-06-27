import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import StyleToggleButtonGroup from "@/wab/client/components/style-controls/StyleToggleButtonGroup";
import DimTokenSpinner from "@/wab/client/components/widgets/DimTokenSelector";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure } from "@/wab/shared/common";
import { parseCssNumericNew } from "@/wab/shared/css";
import { getSliderConfig } from "@/wab/shared/core/transform-utils";
import { Menu, Slider } from "antd";
import { observer } from "mobx-react";
import React, { useEffect } from "react";

interface TransformSettingsPanelProps {
  selfPerspective?: string;
  transformOrigin?: {
    left?: string;
    top?: string;
  };
  perspectiveOrigin?: {
    left?: string;
    top?: string;
  };
  backfaceVisibility?: string;
  childPerspective?: string;
  studioCtx: StudioCtx;
  updateSelfPerspective: (newSelfPerspective: string | undefined) => void;
  updateTransformOrigin: (
    origin: { left: string; top: string } | undefined
  ) => void;
  updatePerspectiveOrigin: (
    origin: { left: string; top: string } | undefined
  ) => void;
  updateBackfaceVisibility: (visibility: string | undefined) => void;
  updateChildPerspective: (newChildPerspective: string | undefined) => void;
}

export const TransformSettingsPanel = observer(function TransformSettingsPanel(
  props: TransformSettingsPanelProps
) {
  const {
    studioCtx,
    selfPerspective,
    transformOrigin,
    backfaceVisibility,
    childPerspective,
    perspectiveOrigin,
    updateSelfPerspective,
    updateTransformOrigin,
    updateBackfaceVisibility,
    updatePerspectiveOrigin,
    updateChildPerspective,
  } = props;
  const parsedSelfPerspective = ensure(
    parseCssNumericNew(selfPerspective || "0px"),
    "Unexpected undefined selfPerspective value"
  );

  const parseOrigin = (origin: { left?: string; top?: string } | undefined) => {
    const originLeft = origin?.left || "0%";
    const originTop = origin?.top || "0%";
    return {
      left: originLeft,
      top: originTop,
      parsedLeft: ensure(
        parseCssNumericNew(originLeft),
        "Unexpected undefined originLeft value"
      ),
      parsedTop: ensure(
        parseCssNumericNew(originTop),
        "Unexpected undefined originTop value"
      ),
    };
  };

  const createUnsetMenu = (onClick) => {
    return (
      <Menu>
        <Menu.Item onClick={onClick}>Unset</Menu.Item>
      </Menu>
    );
  };

  const {
    left: transformOriginLeft,
    top: transformOriginTop,
    parsedLeft: parsedTransformOriginLeft,
    parsedTop: parsedTransformOriginTop,
  } = parseOrigin(transformOrigin);

  const {
    left: perspectiveOriginLeft,
    top: perspectiveOriginTop,
    parsedLeft: parsedPerspectiveOriginLeft,
    parsedTop: parsedPerspectiveOriginTop,
  } = parseOrigin(perspectiveOrigin);

  const parsedChildPerspective = ensure(
    parseCssNumericNew(childPerspective || "0px"),
    "Unexpected undefined childPerspective value"
  );

  // ensure that we stop unlogging in case the component is going to unmount
  useEffect(() => {
    return () => {
      studioCtx.stopUnlogged();
    };
  }, [studioCtx]);

  return (
    <>
      <SidebarSection>
        <LabeledItemRow
          menu={createUnsetMenu(() => updateTransformOrigin(undefined))}
          className="pb-sm"
          label="Origin Left"
          labelSize="small"
        >
          <Slider
            className="mr-lg"
            style={{ minWidth: 100 }}
            included={false}
            value={parsedTransformOriginLeft.num}
            {...getSliderConfig(parsedTransformOriginLeft.units)}
            onChange={(val) => {
              studioCtx.startUnlogged();
              studioCtx.setIsTransformingObject(true);
              updateTransformOrigin({
                left: `${val}${parsedTransformOriginLeft.units}`,
                top: transformOriginTop,
              });
            }}
            onAfterChange={() => {
              studioCtx.stopUnlogged();
              studioCtx.setIsTransformingObject(false);
            }}
          />
          <DimTokenSpinner
            value={transformOriginLeft}
            onChange={(val) => {
              if (val) {
                updateTransformOrigin({
                  left: val,
                  top: transformOriginTop,
                });
              }
            }}
            noClear
            allowedUnits={["%", "px"]}
            hideArrow={true}
          />
        </LabeledItemRow>
        <LabeledItemRow
          menu={createUnsetMenu(() => updateTransformOrigin(undefined))}
          className="pb-sm"
          label="Origin Top"
          labelSize="small"
        >
          <Slider
            className="mr-lg"
            style={{ minWidth: 100 }}
            included={false}
            value={parsedTransformOriginTop.num}
            {...getSliderConfig(parsedTransformOriginTop.units)}
            onChange={(val) => {
              studioCtx.startUnlogged();
              studioCtx.setIsTransformingObject(true);
              updateTransformOrigin({
                left: transformOriginLeft,
                top: `${val}${parsedTransformOriginTop.units}`,
              });
            }}
            onAfterChange={() => {
              studioCtx.stopUnlogged();
              studioCtx.setIsTransformingObject(false);
            }}
          />
          <DimTokenSpinner
            value={transformOriginTop}
            onChange={(val) => {
              if (val) {
                updateTransformOrigin({
                  left: transformOriginLeft,
                  top: val,
                });
              }
            }}
            noClear
            allowedUnits={["%", "px"]}
            hideArrow={true}
          />
        </LabeledItemRow>
        <LabeledItemRow
          label="Backface"
          menu={createUnsetMenu(() => updateBackfaceVisibility(undefined))}
        >
          <StyleToggleButtonGroup
            value={backfaceVisibility}
            onChange={(val) => {
              updateBackfaceVisibility(val);
            }}
            autoWidth
          >
            <StyleToggleButton value="visible" label="Visible" noIcon />
            <StyleToggleButton value="hidden" label="Hidden" noIcon />
          </StyleToggleButtonGroup>
        </LabeledItemRow>
      </SidebarSection>
      <SidebarSection title="Self Perspective" isHeaderActive>
        <LabeledItemRow
          menu={createUnsetMenu(() => updateSelfPerspective(undefined))}
          label="Distance"
          labelSize="small"
        >
          <Slider
            className="mr-lg"
            style={{ minWidth: 100 }}
            included={false}
            value={parsedSelfPerspective.num}
            min={0}
            max={1000}
            onChange={(val) => {
              studioCtx.startUnlogged();
              studioCtx.setIsTransformingObject(true);
              updateSelfPerspective(`${val}${parsedSelfPerspective.units}`);
            }}
            onAfterChange={() => {
              studioCtx.stopUnlogged();
              studioCtx.setIsTransformingObject(false);
            }}
          />
          <DimTokenSpinner
            value={selfPerspective || "0px"}
            onChange={updateSelfPerspective}
            noClear
            allowedUnits={["px"]}
          />
        </LabeledItemRow>
      </SidebarSection>
      <SidebarSection title="Child Perspective" isHeaderActive>
        <LabeledItemRow
          menu={createUnsetMenu(() => updateChildPerspective(undefined))}
          className="pb-sm"
          label="Distance"
          labelSize="small"
        >
          <Slider
            className="mr-lg"
            style={{ minWidth: 100 }}
            included={false}
            value={parsedChildPerspective.num}
            min={0}
            max={1000}
            onChange={(val) => {
              studioCtx.startUnlogged();
              studioCtx.setIsTransformingObject(true);
              updateChildPerspective(`${val}${parsedChildPerspective.units}`);
            }}
            onAfterChange={() => {
              studioCtx.stopUnlogged();
              studioCtx.setIsTransformingObject(false);
            }}
          />
          <DimTokenSpinner
            value={childPerspective || "0px"}
            onChange={updateChildPerspective}
            noClear
            allowedUnits={["px"]}
          />
        </LabeledItemRow>
        <LabeledItemRow
          menu={createUnsetMenu(() => updatePerspectiveOrigin(undefined))}
          className="pb-sm"
          label="Origin Left"
          labelSize="small"
        >
          <Slider
            className="mr-lg"
            style={{ minWidth: 100 }}
            included={false}
            value={parsedPerspectiveOriginLeft.num}
            {...getSliderConfig(parsedPerspectiveOriginLeft.units)}
            onChange={(val) => {
              studioCtx.startUnlogged();
              studioCtx.setIsTransformingObject(true);
              updatePerspectiveOrigin({
                left: `${val}${parsedPerspectiveOriginLeft.units}`,
                top: perspectiveOriginTop,
              });
            }}
            onAfterChange={() => {
              studioCtx.stopUnlogged();
              studioCtx.setIsTransformingObject(false);
            }}
          />
          <DimTokenSpinner
            value={perspectiveOriginLeft}
            onChange={(val) => {
              if (val) {
                updatePerspectiveOrigin({
                  left: val,
                  top: perspectiveOriginTop,
                });
              }
            }}
            noClear
            allowedUnits={["%", "px"]}
            hideArrow={true}
          />
        </LabeledItemRow>
        <LabeledItemRow
          menu={createUnsetMenu(() => updatePerspectiveOrigin(undefined))}
          className="pb-sm"
          label="Origin Top"
          labelSize="small"
        >
          <Slider
            className="mr-lg"
            style={{ minWidth: 100 }}
            included={false}
            value={parsedPerspectiveOriginTop.num}
            {...getSliderConfig(parsedPerspectiveOriginTop.units)}
            onChange={(val) => {
              studioCtx.startUnlogged();
              studioCtx.setIsTransformingObject(true);
              updatePerspectiveOrigin({
                left: perspectiveOriginLeft,
                top: `${val}${parsedPerspectiveOriginTop.units}`,
              });
            }}
            onAfterChange={() => {
              studioCtx.stopUnlogged();
              studioCtx.setIsTransformingObject(false);
            }}
          />
          <DimTokenSpinner
            value={perspectiveOriginTop}
            onChange={(val) => {
              if (val) {
                updatePerspectiveOrigin({
                  left: perspectiveOriginLeft,
                  top: val,
                });
              }
            }}
            noClear
            allowedUnits={["%", "px"]}
            hideArrow={true}
          />
        </LabeledItemRow>
      </SidebarSection>
    </>
  );
});
