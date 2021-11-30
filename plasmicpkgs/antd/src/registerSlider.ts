import { ComponentMeta } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import { Slider, SliderSingleProps } from "antd";
import { Registerable } from "./registerable";

export const sliderMeta: ComponentMeta<SliderSingleProps> = {
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
    step: {
      type: "object",
      description:
        "The granularity the slider can step through values. Must greater than 0, and be divided by (max - min)." +
        " When marks no null, step can be null",
      defaultValue: 1,
    },
    marks: {
      type: "object",
      description:
        "Tick mark of Slider, type of key must be number, and must in closed interval [min, max]," +
        " each mark can declare its own style",
    },
  },
  importPath: "antd",
  importName: "Slider",
};

export function registerSlider(
  loader?: Registerable,
  customSliderMeta?: ComponentMeta<SliderSingleProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Slider, customSliderMeta ?? sliderMeta);
}
