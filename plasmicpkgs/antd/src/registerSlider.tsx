import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Slider } from "antd";
import React from "react";
import { NumPropEditor } from "./customControls";
import { Registerable } from "./registerable";

type SliderProps = React.ComponentProps<typeof Slider>;

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
      type: "custom",
      editOnly: true,
      uncontrolledProp: "defaultValue",
      description: "The default value of slider",
      control: ({ componentProps, updateValue, value }) => {
        React.useEffect(() => {
          if (componentProps.range && typeof value === "number") {
            updateValue([null, value]);
          }
        }, [componentProps.range, value, updateValue]);
        if (!componentProps.range) {
          return <NumPropEditor onChange={updateValue} value={value} />;
        } else {
          const val1 = value?.[0];
          const val2 = value?.[1];
          return (
            <>
              <NumPropEditor
                key="val1"
                onChange={(v) => updateValue([v, val2])}
                value={val1}
              />
              <NumPropEditor
                key="val2"
                onChange={(v) => updateValue([val1, v])}
                value={val2}
              />
            </>
          );
        }
      },
    },
    step: {
      type: "number",
      description:
        "The granularity the slider can step through values. Must greater than 0, and be divided by (max - min)." +
        " When marks no null, step can be null",
      // defaultValueHint: 1,
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
  importPath: "antd",
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
