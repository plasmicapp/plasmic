import { CodeComponentMeta } from "@plasmicapp/host";
import React from "react";
import { Slider, type SliderProps } from "react-aria-components";
import { COMMON_STYLES, getCommonProps } from "./common";
import { PlasmicSliderContext } from "./contexts";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import { registerSliderOutput } from "./registerSliderOutput";
import { registerSliderThumb } from "./registerSliderThumb";
import { registerSliderTrack } from "./registerSliderTrack";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";
import { WithVariants, pickAriaComponentVariants } from "./variant-utils";

const SLIDER_COMPONENT_NAME = makeComponentName("slider");
const RANGE_SLIDER_COMPONENT_NAME = makeComponentName("range-slider");
const SLIDER_VARIANTS = ["disabled" as const];

const { variants, withObservedValues } =
  pickAriaComponentVariants(SLIDER_VARIANTS);

export interface BaseSliderProps<T extends number | number[]>
  extends SliderProps<T>,
    WithVariants<typeof SLIDER_VARIANTS> {
  children?: React.ReactNode;
}

export function BaseSlider<T extends number | number[]>(
  props: BaseSliderProps<T>
) {
  const { children, plasmicUpdateVariant, ...rest } = props;
  return (
    <PlasmicSliderContext.Provider
      value={{
        ...rest,
        // Here's why the type casting is needed here: https://github.com/Microsoft/TypeScript/issues/3410
        onChange: rest.onChange as (value: number | number[]) => void,
        onChangeEnd: rest.onChangeEnd as (value: number | number[]) => void,
      }}
    >
      <Slider<T> {...rest} style={COMMON_STYLES}>
        {({ isDisabled }) =>
          withObservedValues(
            children,
            {
              disabled: isDisabled,
            },
            plasmicUpdateVariant
          )
        }
      </Slider>
    </PlasmicSliderContext.Provider>
  );
}

function getCommonSliderProps<T extends number | number[]>(): CodeComponentMeta<
  BaseSliderProps<T>
>["props"] {
  return {
    orientation: {
      type: "choice",
      options: ["horizontal", "vertical"],
      defaultValueHint: "horizontal",
      defaultValue: "horizontal",
    },
    minValue: {
      type: "number",
      description: "The minimum value of the slider",
      defaultValueHint: 0,
    },
    maxValue: {
      type: "number",
      description: "The maximum value of the slider",
      defaultValueHint: 100,
    },
    step: {
      type: "number",
      description: "The step value of the slider",
      defaultValueHint: 1,
    },
  };
}

export function registerSlider(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSlider<number>>
) {
  const sliderOutputMeta = registerSliderOutput(loader, {
    parentComponentName: SLIDER_COMPONENT_NAME,
  });

  const sliderThumbMeta = registerSliderThumb(loader, {
    parentComponentName: SLIDER_COMPONENT_NAME,
  });
  const sliderTrackMeta = registerSliderTrack(sliderThumbMeta, loader, {
    parentComponentName: SLIDER_COMPONENT_NAME,
  });

  // Register the range slider
  registerComponentHelper(
    loader,
    BaseSlider<number[]>,
    {
      name: RANGE_SLIDER_COMPONENT_NAME,
      displayName: "Aria Range Slider",
      importPath: "@plasmicpkgs/react-aria/skinny/registerSlider",
      importName: "BaseSlider",
      variants,
      defaultStyles: {
        width: "300px",
      },
      props: {
        ...getCommonProps<BaseSliderProps<number[]>>("slider", [
          "isDisabled",
          "aria-label",
        ]),
        ...getCommonSliderProps<number[]>(),
        value: {
          type: "array",
          editOnly: true,
          displayName: "Initial value",
          uncontrolledProp: "defaultValue",
          description: "The intial value of the slider",
          defaultValue: [20, 50],
          validator: (value) => {
            if (!Array.isArray(value)) {
              return "Input must be an array.";
            }

            for (let i = 1; i < value.length; i++) {
              if (value[i] < value[i - 1]) {
                return "Array elements are not in ascending order.";
              }
            }

            return true;
          },
        },
        children: {
          type: "slot",
          defaultValue: [
            {
              type: "hbox",
              styles: {
                width: "stretch",
                justifyContent: "space-between",
                padding: "8px 0px",
              },
              children: [
                {
                  type: "component",
                  name: LABEL_COMPONENT_NAME,
                  props: {
                    children: {
                      type: "text",
                      value: "Label",
                    },
                  },
                },
                {
                  type: "component",
                  name: sliderOutputMeta.name,
                  props: {
                    children: {
                      type: "text",
                      value: "Output",
                    },
                  },
                },
              ],
            },
            {
              type: "component",
              name: sliderTrackMeta.name,
              props: {
                children: [
                  {
                    type: "component",
                    name: sliderThumbMeta.name,
                  },
                  {
                    type: "component",
                    name: sliderThumbMeta.name,
                    styles: {
                      backgroundColor: "blue",
                    },
                  },
                ],
              },
            },
          ],
        },
        onChange: {
          type: "eventHandler",
          argTypes: [{ name: "value", type: "object" }],
        },
        onChangeEnd: {
          type: "eventHandler",
          argTypes: [{ name: "value", type: "object" }],
        },
      },
      states: {
        value: {
          type: "writable",
          valueProp: "value",
          onChangeProp: "onChange",
          variableType: "array",
        },
      },
      trapsFocus: true,
    },
    {
      parentComponentName: SLIDER_COMPONENT_NAME,
    }
  );

  registerComponentHelper(
    loader,
    BaseSlider<number>,
    {
      name: SLIDER_COMPONENT_NAME,
      displayName: "Aria Slider",
      importPath: "@plasmicpkgs/react-aria/skinny/registerSlider",
      importName: "BaseSlider",
      variants,
      defaultStyles: {
        width: "300px",
      },
      props: {
        ...getCommonProps<BaseSliderProps<number>>("slider", [
          "isDisabled",
          "aria-label",
        ]),
        ...getCommonSliderProps<number>(),
        children: {
          type: "slot",
          defaultValue: [
            {
              type: "hbox",
              styles: {
                width: "stretch",
                justifyContent: "space-between",
                padding: "8px 0px",
              },
              children: [
                {
                  type: "component",
                  name: LABEL_COMPONENT_NAME,
                  props: {
                    children: {
                      type: "text",
                      value: "Label",
                    },
                  },
                },
                {
                  type: "component",
                  name: sliderOutputMeta.name,
                  props: {
                    children: {
                      type: "text",
                      value: "Output",
                    },
                  },
                },
              ],
            },
            {
              type: "component",
              name: sliderTrackMeta.name,
            },
          ],
        },
        value: {
          type: "number",
          editOnly: true,
          displayName: "Initial value",
          uncontrolledProp: "defaultValue",
          description: "The initial value of the slider",
          defaultValueHint: 0,
          defaultValue: 0,
        },
        onChange: {
          type: "eventHandler",
          argTypes: [{ name: "value", type: "number" }],
        },
        onChangeEnd: {
          type: "eventHandler",
          argTypes: [{ name: "value", type: "number" }],
        },
      },
      states: {
        value: {
          type: "writable",
          valueProp: "value",
          onChangeProp: "onChange",
          variableType: "number",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
