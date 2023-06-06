import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Slider as AntdSlider } from "antd";
import type { SliderRangeProps, SliderSingleProps } from "antd/es/slider";
import React from "react";
import { Registerable } from "./registerable";

type SliderProps = Omit<
  SliderSingleProps | SliderRangeProps,
  "value" | "defaultValue"
> & {
  value?: number;
  defaultValue?: number;
  value2?: number;
  defaultValue2?: number;
};

export const Slider = React.forwardRef<unknown, SliderProps>(
  ({ value, defaultValue, value2, defaultValue2, ...props }, ref) => {
    const newProps = { ...props } as SliderSingleProps | SliderRangeProps;
    if (props.range) {
      if (typeof value === "number" || typeof value2 === "number") {
        newProps.value = [value ?? 0, value2 ?? 0];
      }
      if (
        typeof defaultValue === "number" ||
        typeof defaultValue2 === "number"
      ) {
        newProps.defaultValue = [defaultValue ?? 0, defaultValue2 ?? 0];
      }
    } else {
      if (typeof value === "number") {
        newProps.value = value;
      }
      if (typeof defaultValue === "number") {
        newProps.defaultValue = defaultValue;
      }
    }
    return <AntdSlider {...newProps} ref={ref} />;
  }
);

export const sliderMeta: ComponentMeta<SliderProps> = {
  name: "AntdSlider",
  displayName: "Antd Slider",
  props: {
    max: {
      type: "number",
      description: "The maximum value the slider can slide to",
      defaultValueHint: 100,
    },
    min: {
      type: "number",
      description: "The minimum value the slider can slide to",
      defaultValueHint: 0,
    },
    included: {
      type: "boolean",
      description:
        "Make effect when marks not null, true means containment and false means coordinative",
      defaultValueHint: true,
    },
    disabled: {
      type: "boolean",
      description: "If true, the slider will not be interactable",
      defaultValueHint: false,
    },
    range: {
      type: "boolean",
      description: "Dual thumb mode",
      defaultValueHint: false,
    },
    reverse: {
      type: "boolean",
      description: "Reverse the component",
      defaultValueHint: false,
    },
    vertical: {
      type: "boolean",
      description: "If true, the slider will be vertical",
      defaultValueHint: false,
    },
    value: {
      type: "number",
      editOnly: true,
      uncontrolledProp: "defaultValue",
      description: "The default value of slider",
    },
    value2: {
      type: "number",
      displayName: "value 2",
      editOnly: true,
      uncontrolledProp: "defaultValue2",
      description: "The default value for the second value of the slider",
      hidden: (props) => !props.range,
    },
    step: {
      type: "number",
      description:
        "The granularity the slider can step through values. Must greater than 0, and be divided by (max - min)." +
        " When marks no null, step can be null",
      defaultValueHint: 1,
    },
    marks: {
      type: "object",
      description:
        "Tick mark of Slider, type of key must be number, and must in closed interval [min, max]," +
        " each mark can declare its own style",
    },
  },
  defaultStyles: {
    width: "200px",
    maxWidth: "100%",
  },
  importPath: "@plasmicpkgs/antd/skinny/registerSlider",
  importName: "Slider",
};

export function registerSlider(
  loader?: Registerable,
  customSliderMeta?: ComponentMeta<SliderProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Slider, customSliderMeta ?? sliderMeta);
}
