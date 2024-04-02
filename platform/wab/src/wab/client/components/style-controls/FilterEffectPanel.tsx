import {
  FullRow,
  LabeledItemRow,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { ColorPicker } from "@/wab/client/components/widgets/ColorPicker";
import DimTokenSpinner from "@/wab/client/components/widgets/DimTokenSelector";
import Select from "@/wab/client/components/widgets/Select";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { cx, ensure } from "@/wab/common";
import { parseCssNumericNew } from "@/wab/css";
import {
  defaultFilterEffects,
  FilterEffect,
  filterEffectEditorConfig,
  getFilterEffectLabel,
} from "@/wab/filter-effect-utils";
import { Slider } from "antd";
import { observer } from "mobx-react";
import React, { useEffect } from "react";
import styles from "./FilterEffectPanel.module.sass";

interface FilterEffectPanelProps {
  studioCtx: StudioCtx;
  filterEffect: FilterEffect;
  onChange: (newFilterEffect: FilterEffect) => void;
}

const menuDescription = {
  General: ["blur", "drop-shadow"],
  "Color Adjustments": ["brightness", "contrast", "hue-rotate", "saturate"],
  "Color Effects": ["grayscale", "invert", "sepia"],
};

export const FilterEffectPanel = observer((props: FilterEffectPanelProps) => {
  const { filterEffect, onChange } = props;

  return (
    <>
      <LabeledItemRow label="Filter" labelSize="small">
        <Select
          className={styles.Dropdown}
          value={filterEffect.type}
          onChange={(effect) => {
            if (effect) {
              onChange(defaultFilterEffects[effect]);
            }
          }}
        >
          {["General", "Color Adjustments", "Color Effects"].map((title) => (
            <Select.OptionGroup title={<span>{title}</span>} key={title}>
              {menuDescription[title].map((effect) => (
                <Select.Option key={effect} value={effect}>
                  <span>{getFilterEffectLabel(effect)}</span>
                </Select.Option>
              ))}
            </Select.OptionGroup>
          ))}
        </Select>
      </LabeledItemRow>
      <FilterEffectEditor {...props} />
    </>
  );
});

const FilterEffectEditor = (props: FilterEffectPanelProps) => {
  const { studioCtx, filterEffect, onChange } = props;
  const { type } = filterEffect;

  // ensure that we stop unlogging in case the component is going to unmount
  useEffect(() => {
    return () => {
      studioCtx.stopUnlogged();
    };
  }, [studioCtx]);

  if (type === "drop-shadow") {
    const { args } = filterEffect;
    const [X, Y, rad, color] = args;
    const parsedX = ensure(
      parseCssNumericNew(X),
      "Unexpected undefined numeric value for X"
    );
    const parsedY = ensure(
      parseCssNumericNew(Y),
      "Unexpected undefined numeric value for Y"
    );
    const parsedRad = ensure(
      parseCssNumericNew(rad),
      "Unexpected undefined numeric value for rad"
    );
    return (
      <>
        <LabeledItemRow label="X" labelSize="small">
          <FullRow>
            <div className={cx(styles.EffectControllersContainer, "flex-row")}>
              <Slider
                className={cx("mr-lg", styles.slider)}
                included={false}
                value={parsedX.num}
                min={0}
                max={20}
                onChange={(val) => {
                  studioCtx.startUnlogged();
                  filterEffect.args[0] = `${val}${parsedX.units}`;
                  onChange(filterEffect);
                }}
                onAfterChange={() => {
                  studioCtx.stopUnlogged();
                }}
              />
              <DimTokenSpinner
                value={X}
                onChange={(val) => {
                  if (val) {
                    filterEffect.args[0] = val;
                    onChange(filterEffect);
                  }
                }}
                noClear
                allowedUnits={["px"]}
              />
            </div>
          </FullRow>
        </LabeledItemRow>
        <LabeledItemRow label="Y" labelSize="small">
          <FullRow>
            <div className={cx(styles.EffectControllersContainer, "flex-row")}>
              <Slider
                className={cx("mr-lg", styles.slider)}
                included={false}
                value={parsedY.num}
                min={0}
                max={20}
                onChange={(val) => {
                  studioCtx.startUnlogged();
                  filterEffect.args[1] = `${val}${parsedY.units}`;
                  onChange(filterEffect);
                }}
                onAfterChange={() => {
                  studioCtx.stopUnlogged();
                }}
              />
              <DimTokenSpinner
                value={Y}
                onChange={(val) => {
                  if (val) {
                    filterEffect.args[1] = val;
                    onChange(filterEffect);
                  }
                }}
                noClear
                allowedUnits={["px"]}
              />
            </div>
          </FullRow>
        </LabeledItemRow>
        <LabeledItemRow label="Radius" labelSize="small">
          <FullRow>
            <div className={cx(styles.EffectControllersContainer, "flex-row")}>
              <Slider
                className={cx("mr-lg", styles.slider)}
                included={false}
                value={parsedRad.num}
                min={0}
                max={10}
                step={1}
                onChange={(val) => {
                  studioCtx.startUnlogged();
                  filterEffect.args[2] = `${val}${parsedRad.units}`;
                  onChange(filterEffect);
                }}
                onAfterChange={() => {
                  studioCtx.stopUnlogged();
                }}
              />
              <DimTokenSpinner
                value={rad}
                onChange={(val) => {
                  if (val) {
                    filterEffect.args[2] = val;
                    onChange(filterEffect);
                  }
                }}
                noClear
                allowedUnits={["px"]}
              />
            </div>
          </FullRow>
        </LabeledItemRow>
        <LabeledItemRow label="Color">{null}</LabeledItemRow>
        <ColorPicker
          color={color}
          onChange={(newColor) => {
            filterEffect.args[3] = newColor;
            onChange(filterEffect);
          }}
        />
      </>
    );
  } else {
    const parsed = ensure(
      parseCssNumericNew(filterEffect.args[0]),
      "Unexpected undefined numeric value"
    );
    return (
      <LabeledItemRow
        label={<span>{filterEffectEditorConfig[type].label}</span>}
        labelSize="small"
      >
        <FullRow>
          <div className={cx(styles.EffectControllersContainer, "flex-row")}>
            <Slider
              className={cx("mr-lg", styles.slider)}
              included={false}
              value={parsed.num}
              min={0}
              step={1}
              max={filterEffectEditorConfig[type].max}
              onChange={(val) => {
                studioCtx.startUnlogged();
                filterEffect.args[0] = `${val}${parsed.units}`;
                onChange(filterEffect);
              }}
              onAfterChange={() => {
                studioCtx.stopUnlogged();
              }}
            />
            <DimTokenSpinner
              value={filterEffect.args[0]}
              onChange={(val) => {
                if (val) {
                  filterEffect.args[0] = val;
                  onChange(filterEffect);
                }
              }}
              noClear
              allowedUnits={filterEffectEditorConfig[type].allowedUnits}
            />
          </div>
        </FullRow>
      </LabeledItemRow>
    );
  }
};
