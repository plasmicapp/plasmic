import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import StyleToggleButtonGroup from "@/wab/client/components/style-controls/StyleToggleButtonGroup";
import DimTokenSpinner from "@/wab/client/components/widgets/DimTokenSelector";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getSliderConfig } from "@/wab/shared/core/transform-utils";
import { parseCssNumericNew } from "@/wab/shared/css";
import {
  CssTransform,
  RotateTransform,
  ScaleTransform,
  SkewTransform,
  TranslateTransform,
  defaultCssTransform,
} from "@/wab/shared/css/transforms";
import { Slider } from "antd";
import { observer } from "mobx-react";
import React, { useEffect } from "react";

interface TransformPanelProps {
  studioCtx: StudioCtx;
  transform: CssTransform;
  onChange: (newTransform: CssTransform) => void;
}

export const TransformPanel = observer(function TransformPanel(
  props: TransformPanelProps
) {
  const { studioCtx, transform, onChange } = props;

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
          const cssTransform = CssTransform.fromCss(defaultCssTransform[val]);
          if (cssTransform) {
            onChange(cssTransform);
          }
        }}
      >
        <StyleToggleButton
          stretched
          value="translate"
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
            transform: transform.showCss(),
            backgroundColor: "grey",
          }}
        ></div>
      </div>
      {renderSliders(transform, studioCtx, onChange)}
    </>
  );
});

function renderSliders(
  transform: CssTransform,
  studioCtx: StudioCtx,
  onChange: (newTransform: CssTransform) => void
) {
  if (transform instanceof TranslateTransform) {
    return renderDimensions(transform, ["X", "Y", "Z"], studioCtx, onChange);
  }
  if (transform instanceof RotateTransform) {
    return renderDimensions(
      transform,
      ["X", "Y", "Z", "angle"],
      studioCtx,
      onChange
    );
  }
  if (transform instanceof ScaleTransform) {
    return renderDimensions(transform, ["X", "Y", "Z"], studioCtx, onChange);
  }
  if (transform instanceof SkewTransform) {
    return renderDimensions(transform, ["X", "Y"], studioCtx, onChange);
  }

  return null;
}

// Generic helper to render multiple dimensions for a given transform
function renderDimensions<T extends CssTransform>(
  transform: T,
  dimensionKeys: Array<keyof T & string>,
  studioCtx: StudioCtx,
  onChange: (newTransform: CssTransform) => void
) {
  return dimensionKeys.map((key) => (
    <DimensionSlider
      key={key}
      studioCtx={studioCtx}
      transform={transform}
      dimensionKey={key}
      onChange={onChange}
    />
  ));
}

// Generic dimension slider component that works with any transform type
function DimensionSlider<T extends CssTransform>(props: {
  studioCtx: StudioCtx;
  transform: T;
  dimensionKey: keyof T & string;
  onChange: (newTransform: CssTransform) => void;
}) {
  const { studioCtx, transform, dimensionKey, onChange } = props;
  const value = transform[dimensionKey] as string;
  const allowedUnits = transform.allowedUnits[dimensionKey];
  const parsed = parseCssNumericNew(value);

  if (!parsed) {
    return null;
  }

  const sliderConfig = getSliderConfig(parsed.units ?? "");

  return (
    <LabeledItemRow
      key={`transform-item-${dimensionKey}`}
      className="pb-sm"
      label={dimensionKey}
      labelSize="small"
    >
      <Slider
        className="mr-lg"
        style={{ minWidth: 100 }}
        included={false}
        value={parsed.num ?? 0}
        {...sliderConfig}
        onChange={(val) => {
          studioCtx.setIsTransformingObject(true);
          studioCtx.startUnlogged();
          const newTransform = transform.clone({
            [dimensionKey]: `${val}${parsed.units ?? ""}`,
          });
          onChange(newTransform);
        }}
        onAfterChange={() => {
          studioCtx.setIsTransformingObject(false);
          studioCtx.stopUnlogged();
        }}
      />
      <DimTokenSpinner
        value={value}
        onChange={(val) => {
          if (val) {
            const newTransform = transform.clone({
              [dimensionKey]: val,
            });
            onChange(newTransform);
          }
        }}
        noClear
        allowedUnits={allowedUnits}
      />
    </LabeledItemRow>
  );
}
