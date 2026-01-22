import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Slider as AntdSlider } from "antd";
import type { SliderRangeProps, SliderSingleProps } from "antd/es/slider";
import React from "react";
import { Registerable } from "./registerable";

type SliderProps = Omit<
  SliderSingleProps | SliderRangeProps,
  "value" | "defaultValue" | "onChange"
> & {
  value: number;
  value2: number;
  onChange: (val: number) => void;
  onChange2: (val: number) => void;
};

export const Slider = React.forwardRef<unknown, SliderProps>(function Slider(
  { value, value2, onChange, onChange2, ...props },
  ref
) {
  const newProps = { ...props } as SliderSingleProps | SliderRangeProps;
  if (props.range) {
    if (typeof value === "number" || typeof value2 === "number") {
      newProps.value = [value ?? 0, value2 ?? 0];
    }
    newProps.onChange = (values: [number, number]) => {
      onChange(values[0]);
      onChange2(values[1]);
    };
  } else {
    if (typeof value === "number") {
      newProps.value = value;
    }
    newProps.onChange = onChange;
  }
  return <AntdSlider {...newProps} ref={ref} />;
});

export const sliderMeta: CodeComponentMeta<SliderProps> = {
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
      displayName: "Value",
      editOnly: true,
      description: "Initial value for the slider",
    },
    onChange: {
      type: "eventHandler",
      argTypes: [{ name: "value", type: "number" }],
    },
    value2: {
      type: "number",
      displayName: "Second Value",
      editOnly: true,
      description: "Initial second value for the slider",
      hidden: (props) => !props.range,
    },
    onChange2: {
      type: "eventHandler",
      argTypes: [{ name: "value", type: "number" }],
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
  states: {
    value: {
      type: "writable",
      variableType: "number",
      valueProp: "value",
      onChangeProp: "onChange",
    },
    value2: {
      type: "writable",
      variableType: "number",
      valueProp: "value2",
      onChangeProp: "onChange2",
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
  customSliderMeta?: CodeComponentMeta<SliderProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Slider, customSliderMeta ?? sliderMeta);
}
