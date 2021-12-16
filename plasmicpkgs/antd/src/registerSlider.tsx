import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Slider as AntdSlider } from "antd";
import type { SliderRangeProps, SliderSingleProps } from "antd/lib/slider";
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
      newProps.value = value;
      newProps.defaultValue = defaultValue;
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
    },
    min: {
      type: "number",
      description: "The minimum value the slider can slide to",
    },
    included: {
      type: "boolean",
      description:
        "Make effect when marks not null, true means containment and false means coordinative",
    },
    disabled: {
      type: "boolean",
      description: "If true, the slider will not be interactable",
    },
    range: {
      type: "boolean",
      description: "Dual thumb mode",
    },
    reverse: {
      type: "boolean",
      description: "Reverse the component",
    },
    vertical: {
      type: "boolean",
      description: "If true, the slider will be vertical",
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
  importPath: "@plasmicpkgs/antd",
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
