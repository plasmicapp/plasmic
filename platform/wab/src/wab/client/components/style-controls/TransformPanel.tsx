import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import StyleToggleButtonGroup from "@/wab/client/components/style-controls/StyleToggleButtonGroup";
import DimTokenSpinner from "@/wab/client/components/widgets/DimTokenSelector";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { parseCssNumericNew } from "@/wab/css";
import {
  defaultTransforms,
  fromTransformObjToString,
  getSliderConfig,
  Transform,
  transformAllowedUnits,
} from "@/wab/transform-utils";
import { Slider } from "antd";
import { observer } from "mobx-react";
import React, { useEffect } from "react";

interface TransformPanelProps {
  studioCtx: StudioCtx;
  transform: Transform;
  onChange: (newTransform: Transform) => void;
}

export const TransformPanel = observer(function TransformPanel(
  props: TransformPanelProps
) {
  const { studioCtx, transform, onChange } = props;
  const { type, X, Y, Z } = transform;
  const parsed = {
    X: X && parseCssNumericNew(X),
    Y: Y && parseCssNumericNew(Y),
    Z: Z && parseCssNumericNew(Z),
  };
  const axis = ["X", "Y", "Z"];

  // ensure that we stop unlogging in case the component is going to unmount
  useEffect(() => {
    return () => {
      studioCtx.stopUnlogged();
    };
  }, [studioCtx]);
  return (
    <>
      <StyleToggleButtonGroup
        className="pb-sm"
        value={transform.type}
        onChange={(val) => {
          if (val) {
            onChange(defaultTransforms[val]);
          }
        }}
      >
        <StyleToggleButton
          stretched
          value="move"
          label={"Move"}
          showLabel
          children={null}
        />
        <StyleToggleButton
          stretched
          value="rotate"
          label={"Rotate"}
          showLabel
          children={null}
        />
        <StyleToggleButton
          stretched
          value="scale"
          label={"Scale"}
          showLabel
          children={null}
        />
        <StyleToggleButton
          stretched
          value="skew"
          label={"Skew"}
          showLabel
          children={null}
        />
      </StyleToggleButtonGroup>
      <div
        className="panel-dim-block flex flex-vcenter flex-hcenter fill-width overflow-hidden mb-sm"
        style={{
          height: 100,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            transform: fromTransformObjToString(transform),
            backgroundColor: "grey",
          }}
        ></div>
      </div>
      {axis.map((ax) => {
        if (!parsed[ax]) {
          return null;
        }
        const sliderConfig = getSliderConfig(parsed[ax].units);
        return (
          <LabeledItemRow
            key={`transform-item-${ax}`}
            className="pb-sm"
            label={ax}
            labelSize="small"
          >
            <Slider
              className="mr-lg"
              style={{ minWidth: 100 }}
              included={false}
              value={parsed[ax].num}
              {...sliderConfig}
              onChange={(val) => {
                studioCtx.setIsTransformingObject(true);
                studioCtx.startUnlogged();
                transform[ax] = `${val}${parsed[ax].units}`;
                onChange(transform);
              }}
              onAfterChange={() => {
                studioCtx.setIsTransformingObject(false);
                studioCtx.stopUnlogged();
              }}
            />
            <DimTokenSpinner
              value={transform[ax]}
              onChange={(val) => {
                transform[ax] = val;
                onChange(transform);
              }}
              noClear
              allowedUnits={transformAllowedUnits[type]}
            />
          </LabeledItemRow>
        );
      })}
    </>
  );
});
